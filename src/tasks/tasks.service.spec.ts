import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;

  const mockTasksRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const sampleTask = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Перевіка unit тести',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    createdAt: new Date('2026-11-24T00:00:00.000Z'),
    updatedAt: new Date('2026-11-24T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('створюється задача коли Id не передано', async () => {
    const dto = { title: 'Нова задача' };
    mockTasksRepository.create.mockResolvedValue(sampleTask);

    const result = await service.create(dto);

    expect(result).toEqual(sampleTask);
    expect(mockTasksRepository.create).toHaveBeenCalledWith(dto, undefined);
  });

  it('помилка при неправилному Id', async () => {
    const dto = { title: 'Нова задача' };

    await expect(service.create(dto, 'not-a-uuid')).rejects.toThrow(BadRequestException);
    expect(mockTasksRepository.create).not.toHaveBeenCalled();
  });

  it('повернення задачі за id якщо вона знайдена', async () => {
    mockTasksRepository.findById.mockResolvedValue(sampleTask);

    const result = await service.findOne(sampleTask.id);

    expect(result).toEqual(sampleTask);
    expect(mockTasksRepository.findById).toHaveBeenCalledWith(sampleTask.id);
  });

  it('помилка при не незнайденому завданні', async () => {
    mockTasksRepository.findById.mockResolvedValue(null);

    await expect(service.findOne(sampleTask.id)).rejects.toThrow(NotFoundException);
  });

  it('повертає { success: true } після видалення задачі', async () => {
    mockTasksRepository.delete.mockResolvedValue(undefined);

    const result = await service.remove(sampleTask.id);

    expect(result).toEqual({ success: true });
    expect(mockTasksRepository.delete).toHaveBeenCalledWith(sampleTask.id);
  });

  it('передає фільтри status та priority у репозиторій у findAll', async () => {
    const filteredTasks = [sampleTask];
    mockTasksRepository.findAll.mockResolvedValue(filteredTasks);

    const result = await service.findAll(TaskStatus.TODO, TaskPriority.HIGH);

    expect(result).toEqual(filteredTasks);
    expect(mockTasksRepository.findAll).toHaveBeenCalledWith(TaskStatus.TODO, TaskPriority.HIGH);
  });

  it('має оновлювати задачу та повертати оновлений запис у update', async () => {
    const updateDto = { status: TaskStatus.DONE };
    const updatedTask = {
      sampleTask,
      status: TaskStatus.DONE,
    };
    mockTasksRepository.update.mockResolvedValue(updatedTask);

    const result = await service.update(sampleTask.id, updateDto);

    expect(result).toEqual(updatedTask);
    expect(mockTasksRepository.update).toHaveBeenCalledWith(sampleTask.id, updateDto);
  });
});
