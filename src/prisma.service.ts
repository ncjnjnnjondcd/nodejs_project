import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      // перевірка працездатності сховища на старті
      await this.$queryRaw`SELECT 1;`;
      this.logger.log('База даних SQLite успішно ініціалізована та готова до роботи');
    } catch (error) {
      this.logger.error('Критична помилка ініціалізації БД під час старту:', error);
      // сервер не повинен приймати запити якщо бд мертва
      process.exit(1);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
