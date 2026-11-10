import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { randomUUID } from 'crypto';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';

@Injectable()
export class TasksService {
  private tasks: Map<string, Task> = new Map();
  create(dto: CreateTaskDto): Task {
    const id = randomUUID();
    const now = new Date();
    const task: Task = {
      id,
      title: dto.title,
      description: dto.description,
      status: TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  findAll(status?: string, priority?: string): Task[] {
    let result = Array.from(this.tasks.values());

    if (status) {
      result = result.filter((task) => task.status === status);
    }

    if (priority) {
      result = result.filter((task) => task.priority === priority);
    }

    return result;
  }

  findOne(id: string): Task {
    const task = this.tasks.get(id);

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = TaskStatus.TODO;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    task.updatedAt = new Date();
    return task;
  }

  remove(id: string): { success: boolean } {
    this.findOne(id);

    this.tasks.delete(id);

    return { success: true };
  }
}
