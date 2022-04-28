import { Body, Controller, Post } from '@nestjs/common';
import { SendMailProducerService } from 'src/jobs/send-mail-producer.service';
import CreateStudentDto from './dto/create-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private sendMailProducer: SendMailProducerService,
  ) {}

  @Post('/')
  async createStudent(@Body() createStudentDto: CreateStudentDto) {
    this.sendMailProducer.sendMail(createStudentDto);
    return {
      message: 'Student created',
    };
  }
}
