import { Injectable, ConflictException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { Prisma, Task, TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksRepository {
  private readonly logger = new Logger(TasksRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // cтворення завдання із захистом від дублювання

  async create(dto: CreateTaskDto, clientTaskId?: string): Promise<Task> {
    return this.executeWithRetry(async () => {
      try {
        return await this.prisma.task.create({
          data: {
            id: clientTaskId, // якщо клієнт надав власний UUID для ідемпотентності
            title: dto.title,
            description: dto.description,
            status: TaskStatus.TODO,
            priority: (dto.priority as TaskPriority) ?? TaskPriority.MEDIUM,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // id вже існує - ідемпотентний повтор запиту
          if (error.code === 'P2002') {
            throw new ConflictException(`Завдання з таким ID або назвою вже існує`);
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

  // oновлення в межах ізольованої операції бд

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.executeWithRetry(async () => {
      return this.prisma.task.update({
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
  }

  //атомарне видалення в транзакції
  async delete(id: string): Promise<void> {
    await this.executeWithRetry(async () => {
      // Prisma $transaction гарантує атомарність операцій у сховищі
      await this.prisma.$transaction(async (tx) => {
        await tx.task.delete({
          where: { id },
        });
      });
    });
  }

  // механізм повторних спроб при тимчасових збоях

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
