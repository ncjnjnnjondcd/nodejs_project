import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { TasksService } from '../src/tasks/tasks.service';
import { TasksRepository } from '../src/tasks/tasks.repository';
import { PrismaService } from '../src/prisma.service';

describe('TasksService (Integration with SQLite)', () => {
  let service: TasksService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, TasksRepository, PrismaService],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.$connect();
  });

  beforeEach(async () => {
    // очищення таблиці перед тестом
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.$disconnect();
  });

  it('створення задачі в БД, знайти її за id, оновити статус і видалити', async () => {
    const created = await service.create({
      title: 'Інтеграційний тест з БД',
      priority: TaskPriority.HIGH,
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Інтеграційний тест з БД');
    expect(created.status).toBe(TaskStatus.TODO);
    expect(created.priority).toBe(TaskPriority.HIGH);

    const found = await service.findOne(created.id);
    expect(found.id).toBe(created.id);

    const updated = await service.update(created.id, {
      status: TaskStatus.DONE,
    });
    expect(updated.status).toBe(TaskStatus.DONE);

    const removed = await service.remove(created.id);
    expect(removed).toEqual({ success: true });

    await expect(service.findOne(created.id)).rejects.toThrow(NotFoundException);
  });

  it('перевірка на правильність ключа', async () => {
    await expect(service.create({ title: 'Невалідний ключ' }, 'not-a-uuid')).rejects.toThrow(
      BadRequestException,
    );

    const tasks = await service.findAll();
    expect(tasks).toHaveLength(0);
  });
});
