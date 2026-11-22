import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, Task, TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AppLogger } from '../common/logger/app.logger';

@Injectable()
export class TasksRepository {
  private readonly logger = new AppLogger(TasksRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // створення завдання із захистом від дублювання
  async create(dto: CreateTaskDto, clientTaskId?: string): Promise<Task> {
    return this.executeWithRetry(async () => {
      try {
        return await this.prisma.task.create({
          data: {
            ...(clientTaskId ? { id: clientTaskId } : {}),
            title: dto.title,
            description: dto.description,
            status: TaskStatus.TODO,
            priority: (dto.priority as TaskPriority) ?? TaskPriority.MEDIUM,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          clientTaskId
        ) {
          // вже створене завдання замість 409 Conflict
          const existingTask = await this.prisma.task.findUnique({
            where: { id: clientTaskId },
          });
          if (existingTask) {
            return existingTask;
          }
        }
        throw error;
      }
    });
  }

  async findAll(status?: TaskStatus, priority?: TaskPriority): Promise<Task[]> {
    return this.executeWithRetry(async () => {
      return this.prisma.task.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findById(id: string): Promise<Task | null> {
    return this.executeWithRetry(async () => {
      return this.prisma.task.findUnique({
        where: { id },
      });
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx) => {
        const existing = await tx.task.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException(`Task with ID "${id}" not found`);
        }

        return tx.task.update({
          where: { id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.status !== undefined ? { status: dto.status as TaskStatus } : {}),
            ...(dto.priority !== undefined ? { priority: dto.priority as TaskPriority } : {}),
            ...(dto.dueDate !== undefined
              ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
              : {}),
          },
        });
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.task.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException(`Task with ID "${id}" not found`);
        }

        await tx.task.delete({
          where: { id },
        });
      });
    });
  }

  //  повторні спроби при тимчасових збоях
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempts = 3,
    delayMs = 150,
  ): Promise<T> {
    for (let i = 1; i <= attempts; i++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const isDbLocked = error instanceof Error && error.message.includes('SQLITE_BUSY');
        if (isDbLocked && i < attempts) {
          this.logger.warn(
            `БД тимчасово заблокована (SQLITE_BUSY). Спроба ${i}/${attempts} через ${delayMs}мс`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs * i));
          continue;
        }
        if (isDbLocked) {
          throw new ServiceUnavailableException(
            'База даних заблокована іншим процесом. Спробуйте пізніше',
          );
        }
        throw error;
      }
    }
    throw new ServiceUnavailableException('Не вдалося виконати операцію з БД');
  }
}
