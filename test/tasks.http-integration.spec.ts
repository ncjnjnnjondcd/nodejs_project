import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TasksController } from '../src/tasks/tasks.controller';
import { TasksService } from '../src/tasks/tasks.service';
import { TasksRepository } from '../src/tasks/tasks.repository';
import { PrismaService } from '../src/prisma.service';

describe('Tasks HTTP Server Integration', () => {
  let app: INestApplication;

  const mockTasksRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const sampleTask = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Тестова задача',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    createdAt: new Date('2026-11-24T00:00:00.000Z'),
    updatedAt: new Date('2026-11-24T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        PrismaService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/tasks/:id з неправильним uuid має повернути 400', async () => {
    const res = await request(app.getHttpServer()).get('/api/tasks/not-a-uuid');

    expect(res.status).toBe(400);
    expect(mockTasksRepository.findById).not.toHaveBeenCalled();
  });

  it('POST /api/tasks з неправильним x-idempotency-key має повернути 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('x-idempotency-key', 'invalid-key')
      .send({ title: 'Тестова задача' });

    expect(res.status).toBe(400);
    expect(mockTasksRepository.create).not.toHaveBeenCalled();
  });

  it('DELETE /api/tasks/:id — має видаляти задачу (200) та відхиляти битий UUID (400)', async () => {
    const badIdRes = await request(app.getHttpServer()).delete('/api/tasks/not-a-uuid');
    expect(badIdRes.status).toBe(400);

    mockTasksRepository.delete.mockResolvedValue(undefined);

    const okRes = await request(app.getHttpServer()).delete(`/api/tasks/${sampleTask.id}`);
    expect(okRes.status).toBe(200);
    expect(okRes.body).toEqual({ success: true });
  });
});
