import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  list(
    @Query('batchId') batchId?: string,
    @Query('transactionId') transactionId?: string,
    @Query('status') status?: string,
    @Query('grouped') grouped?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.questionsService.list({
      batchId,
      transactionId,
      status,
      grouped: grouped === 'true',
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }
}
