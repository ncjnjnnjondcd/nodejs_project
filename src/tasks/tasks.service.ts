import { Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskStatus, TaskPriority } from '@prisma/client';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AppLogger } from '../common/logger/app.logger';

@Injectable()
export class TasksService {
  private readonly logger = new AppLogger(TasksService.name);

  constructor(private readonly tasksRepository: TasksRepository) {}

  async create(dto: CreateTaskDto, clientTaskId?: string): Promise<Task> {
    this.logger.log(`Створення нового завдання: "${dto.title}"`);
    return this.tasksRepository.create(dto, clientTaskId);
  }

  async findAll(status?: string, priority?: string): Promise<Task[]> {
    this.logger.log('Отримання переліку завдань');
    return this.tasksRepository.findAll(
      status as TaskStatus | undefined,
      priority as TaskPriority | undefined,
    );
  }

  async findOne(id: string): Promise<Task> {
    this.logger.log(`Пошук завдання за id=${id}`);

    const task = await this.tasksRepository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    // перевірка існування перед зміною
    this.logger.log(`Оновлення завдання id=${id}`);
    await this.findOne(id);
    return this.tasksRepository.update(id, dto);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    // перевірка існування перед видаленням
    this.logger.log(`Видалення завдання id=${id}`);
    await this.findOne(id);
    await this.tasksRepository.delete(id);
    return { success: true };
  }
}
