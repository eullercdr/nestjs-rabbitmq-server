import { SetMetadata } from '@nestjs/common';
import { Options } from 'amqplib';

export interface RabbitmqSubscribeMetadata {
  exchange: string;
  routingKey: string | string[];
  queue: string;
  queueOptions?: Options.AssertQueue;
}

export const RABBITMQ_SUBSCRIBE_DECORATOR = 'rabbitmq-subscribe-metadata';

export function RabbitmqSubscribe(
  spec: RabbitmqSubscribeMetadata,
): MethodDecorator {
  return SetMetadata(RABBITMQ_SUBSCRIBE_DECORATOR, spec);
}
