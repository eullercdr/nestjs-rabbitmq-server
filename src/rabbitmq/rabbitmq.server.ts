import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable, Logger } from '@nestjs/common';
import {
    AmqpConnectionManager,
    ChannelWrapper,
    connect
} from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import {
    RabbitmqSubscribeMetadata,
    RABBITMQ_SUBSCRIBE_DECORATOR
} from './decorators/rabbitmq-subscriber.decorator';

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
    console.log(subscribers);
    subscribers.map(async (item) => {
      await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
        const { exchange, routingKey, queue, queueOptions } = item;
        const assertQueue = await this.createQueue(queue, queueOptions);
        await channel.bindQueue(assertQueue.queue, exchange, routingKey);
      });
    });
  }

  private async createQueue(queue: string, options?: any): Promise<any> {
    if (!queue) {
      return;
    }
    return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertQueue(queue, options);
    });
  }

  private async getSubscribers(): Promise<RabbitmqSubscribeMetadata[]> {
    const binds = await this.discoveryService.providerMethodsWithMetaAtKey(
      RABBITMQ_SUBSCRIBE_DECORATOR,
    );
    return binds.map((item) => {
      return item.meta as RabbitmqSubscribeMetadata;
    });
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
