import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable, Logger } from '@nestjs/common';
import {
  AmqpConnectionManager,
  Channel,
  ChannelWrapper,
  connect
} from 'amqp-connection-manager';
import { ConfirmChannel, Message } from 'amqplib';
import { groupBy } from 'lodash';
import {
  RabbitmqSubscribeMetadata,
  RABBITMQ_SUBSCRIBE_DECORATOR
} from './decorators/rabbitmq-subscriber.decorator';

export enum ResponseEnum {
  ACK,
  REQUEUE,
  NACK,
  REJECT,
}

@Injectable()
export default class RabbitMQServer {
  private _listening: boolean;
  private _connection: AmqpConnectionManager;
  private _channelManager: ChannelWrapper;

  constructor(private discoveryService: DiscoveryService) {}

  async connect(): Promise<void> {
    this._connection = connect([
      {
        hostname: process.env.RABBITMQ_HOST,
        username: process.env.RABBITMQ_USER,
        password: process.env.RABBITMQ_PASSWORD,
      },
    ]);
    this._channelManager = this.connection.createChannel();
    this._channelManager.on('connect', () => {
      this._listening = true;
      Logger.log('RabbitMQ connected with success', 'RabbitMQ Microservice');
    });
    this._channelManager.on('error', (err, { name }) => {
      this._listening = false;
      Logger.error('Error', err, name);
    });
    this.setupExchanges();
    this.bindSubscribers();
  }

  private async setupExchanges() {
    const exchanges = [
      {
        name: 'exchange.nestjs.rabbitmq.teste1',
        type: 'topic',
        options: {
          durable: true,
        },
      },
      {
        name: 'exchange.nestjs.rabbitmq.teste2',
        type: 'topic',
        options: {
          durable: true,
        },
      },
    ];
    this.channelManager.addSetup(async (channel) => {
      await Promise.all(
        exchanges.map(async (exchange) => {
          await channel.assertExchange(
            exchange.name,
            exchange.type,
            exchange.options,
          );
        }),
      );
    });
  }

  private async bindSubscribers() {
    const subscribers = await this.getSubscribers();
    subscribers.map(async (item) => {
      await this._channelManager.addSetup(async (channel: ConfirmChannel) => {
        const { exchange, queue, routingKey, queueOptions } = item.metadata;
        const assertQueue = await this.createQueue(
          channel,
          queue,
          queueOptions,
        );
        await this.bindQueue(channel, routingKey, assertQueue, exchange);
        await this.consume({
          channel,
          queue: assertQueue.queue,
          method: item.method,
        });
      });
    });
  }

  private async createQueue(
    channel: ConfirmChannel,
    queue,
    queueOptions = undefined,
  ) {
    if (!queue) {
      return;
    }
    return channel.assertQueue(queue, queueOptions);
  }

  private async bindQueue(
    channel: ConfirmChannel,
    routingKey,
    assertQueue,
    exchange,
  ) {
    const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];
    return Promise.all(
      routingKeys.map((key) =>
        channel.bindQueue(assertQueue.queue, exchange, key),
      ),
    );
  }

  private async getSubscribers(): Promise<
    {
      method: Function;
      metadata: RabbitmqSubscribeMetadata;
    }[]
  > {
    const providers = await this.discoveryService.providerMethodsWithMetaAtKey(
      RABBITMQ_SUBSCRIBE_DECORATOR,
    );

    const grouped = groupBy(
      providers,
      (x) => x.discoveredMethod.parentClass.name,
    );

    return Object.keys(grouped)
      .map((providerKey) => {
        const metadata = grouped[providerKey];
        const methods = [];
        metadata.forEach((method) => {
          const service = method.discoveredMethod.parentClass.instance;
          methods.push({
            method: service[method.discoveredMethod.methodName].bind(service),
            metadata: method.meta,
          });
        });
        return methods;
      })
      .reduce((collection: any, item: any) => {
        collection.push(...item);
        return collection;
      }, []);
  }

  private async consume({
    channel,
    queue,
    method,
  }: {
    channel: ConfirmChannel;
    queue: string;
    method: Function;
  }) {
    await channel.consume(queue, async (message) => {
      try {
        if (!message) {
          throw new Error('Received null message');
        }

        const content = message.content;

        if (content) {
          let data;
          try {
            data = JSON.parse(content.toString());
          } catch (e) {
            data = null;
          }
          const responseType = await method({ data, message, channel });
          this.dispatchResponse(channel, message, responseType);
        }
      } catch (e) {
        console.log('error');
        console.error(e, {
          routingKey: message?.fields.routingKey,
          content: message?.content.toString(),
        });
        if (!message) {
          return;
        }
        this.dispatchResponse(channel, message);
      }
    });
  }

  private dispatchResponse(
    channel: Channel,
    message: Message,
    responseType?: ResponseEnum,
  ) {
    switch (responseType) {
      case ResponseEnum.REQUEUE:
        channel.nack(message, false, true);
        break;
      case ResponseEnum.NACK:
        this.handleNack({ channel, message });
        break;
      case ResponseEnum.REJECT:
        channel.reject(message, false);
        break;
      case ResponseEnum.ACK:
      default:
        channel.ack(message);
    }
  }

  canDeadLetter({ channel, message }: { channel: Channel; message: Message }) {
    if (message.properties.headers && 'x-death' in message.properties.headers) {
      const count = message.properties.headers['x-death']![0].count;
      if (count >= 3) {
        channel.ack(message);
        const queue = message.properties.headers['x-death']![0].queue;
        console.error(
          `Ack in ${queue} with error. Max attempts exceeded: ${3}`,
        );
        return false;
      }
    }
    return true;
  }

  handleNack({ channel, message }: { channel: Channel; message: Message }) {
    const canDeadLetter = this.canDeadLetter({ channel, message });
    if (canDeadLetter) {
      console.log('Nack in message', { content: message.content.toString() });
      channel.nack(message, false, false);
    } else {
      channel.ack(message);
    }
  }

  get listening(): boolean {
    return this._listening;
  }

  get connection(): AmqpConnectionManager {
    return this._connection;
  }

  get channelManager(): ChannelWrapper {
    return this._channelManager;
  }
}
