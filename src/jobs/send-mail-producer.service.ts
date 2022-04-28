import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import CreateStudentDto from 'src/students/dto/create-student.dto';

@Injectable()
export class SendMailProducerService {
  constructor(@InjectQueue('send-mail-queue') private queue: Queue) {}

  async sendMail(user: CreateStudentDto) {
    await this.queue.add('sendMail-job', user, {
      delay: 5000,
      attempts: 3,
    });
  }
}
