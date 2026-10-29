import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @IsNotEmpty({ message: 'Назва задачі є обов’язковою' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Пріоритет має бути: LOW, MEDIUM або HIGH' })
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate має бути валідним ISO-рядком дати' })
  dueDate?: string;
}