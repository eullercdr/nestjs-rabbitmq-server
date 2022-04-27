import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StudentsService {
  @RabbitSubscribe({
    exchange: 'exchange1',
    routingKey: 'subscribe-route',
    queue: 'subscribe-queue',
  })
  public async pubSubHandler(msg: {}) {
    console.log(`Received pub/sub message: ${JSON.stringify(msg)}`);
  }
}
