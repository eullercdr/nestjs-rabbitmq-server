import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import RabbitMQServer from './rabbitmq.server';

@Module({
  imports: [ConfigModule.forRoot({}), DiscoveryModule],
  providers: [RabbitMQServer],
  exports: [RabbitMQServer],
})
export class RabbitmqModule implements OnModuleInit {
  constructor(private server: RabbitMQServer) {}

  async onModuleInit() {
    await this.server.connect();
  }
}
