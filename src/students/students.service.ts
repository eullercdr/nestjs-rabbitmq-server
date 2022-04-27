import { Injectable } from '@nestjs/common';
import { RabbitmqSubscribe } from 'src/rabbitmq/decorators/rabbitmq-subscriber.decorator';

@Injectable()
export class StudentsService {
  @RabbitmqSubscribe({
    exchange: 'exchange.nestjs.rabbitmq.teste1',
    routingKey: 'teste1',
    queue: 'queue.nestjs.rabbitmq.teste1',
  })
  handler({ data }: { data: any }) {
    console.log(data);
  }

  @RabbitmqSubscribe({
    exchange: 'exchange.nestjs.rabbitmq.teste2',
    routingKey: 'teste2',
    queue: 'queue.nestjs.rabbitmq.teste2',
  })
  handler2({ data }: { data: any }) {
    console.log(data);
  }

  @RabbitmqSubscribe({
    exchange: 'exchange.nestjs.rabbitmq.teste3',
    routingKey: 'teste3',
    queue: 'queue.nestjs.rabbitmq.teste3',
  })
  handler3({ data }: { data: any }) {
    console.log(data);
  }
}
