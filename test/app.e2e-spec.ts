import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Tasks E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await prisma.task.deleteMany();
    await app.init();
  });

  afterEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  it('повний цикл: POST, GET, PATCH, DELETE, 404', async () => {
    const server = app.getHttpServer();

    //  створення задачі
    const createRes = await request(server).post('/api/tasks').send({
      title: 'E2E задача',
      description: 'Перевірка повного циклу',
      priority: 'HIGH',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.status).toBe('TODO');
    expect(createRes.body.priority).toBe('HIGH');

    const taskId: string = createRes.body.id;

    // перевірка у списку
    const listRes = await request(server).get('/api/tasks');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((t: { id: string }) => t.id === taskId)).toBe(true);

    // отримання за id
    const getOneRes = await request(server).get(`/api/tasks/${taskId}`);
    expect(getOneRes.status).toBe(200);
    expect(getOneRes.body.title).toBe('E2E задача');

    // оновлення статусу
    const patchRes = await request(server).patch(`/api/tasks/${taskId}`).send({ status: 'DONE' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('DONE');

    // видалення і перевірка після видалення
    const deleteRes = await request(server).delete(`/api/tasks/${taskId}`);
    expect(deleteRes.status).toBe(200);

    const afterDeleteRes = await request(server).get(`/api/tasks/${taskId}`);
    expect(afterDeleteRes.status).toBe(404);
  });

  it('відхиляє невалідні дані при POST (400) і не створює запис у БД', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: '', priority: 'INVALID' });

    expect(res.status).toBe(400);

    const count = await prisma.task.count();
    expect(count).toBe(0);
  });
});
