import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { seedTestData } from '../utils/seed';

export function adminRoutes(prisma: PrismaClient) {
  const router = Router();

  // Добавить тестовые данные
  router.post('/seed', async (req, res) => {
    try {

      await seedTestData(prisma);
      res.json({ success: true, message: 'Test data seeded successfully' });
    } catch (error) {
      console.error('Error seeding test data:', error);
      res.status(500).json({ error: 'Failed to seed test data' });
    }
  });

  // Очистить тестовые данные
  router.delete('/test-data', async (req, res) => {
    try {

      // Удаляем тестовых пользователей (каскадно удалятся и отзывы)
      const deleted = await prisma.user.deleteMany({
        where: {
          telegramId: {
            gte: BigInt(999999000),
            lte: BigInt(999999999)
          }
        }
      });

      res.json({ 
        success: true, 
        message: `Deleted ${deleted.count} test users and their reviews` 
      });
    } catch (error) {
      console.error('Error deleting test data:', error);
      res.status(500).json({ error: 'Failed to delete test data' });
    }
  });

  return router;
}