import { MailerService } from '@nestjs-modules/mailer';
import {
    OnQueueActive,
    OnQueueCompleted,
    OnQueueFailed,
    Process,
    Processor
} from '@nestjs/bull';
import { Job } from 'bull';
import CreateStudentDto from 'src/students/dto/create-student.dto';

@Processor('send-mail-queue')
export class SendMailConsumer {
  constructor(private mailService: MailerService) {}

  @Process('sendMail-job')
  async sendMail(job: Job<CreateStudentDto>) {
    const { data } = job;
    await this.mailService.sendMail({
      to: data.email,
      from: 'Equipe',
      subject: 'Bem vindo ao sistema',
      text: 'Seja bem vindo ao sistema',
    });
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log('ON COMPLETE', job.data);
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log('ON ACTIVE', job.data);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    console.log('ON FAILED', job.data);
  }
}
