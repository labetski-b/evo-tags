import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTelegramWebAppData } from '../utils/telegram';

export function userRoutes(prisma: PrismaClient) {
  const router = Router();

  // Получить всех пользователей
  router.get('/', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить данные текущего пользователя
  router.post('/me', async (req, res) => {
    try {
      const { telegramData } = req.body;
      
      if (!telegramData) {
        return res.status(400).json({ error: 'Telegram data required' });
      }

      // Валидация данных от Telegram
      const userData = validateTelegramWebAppData(telegramData);
      if (!userData) {
        return res.status(401).json({ error: 'Invalid Telegram data' });
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(userData.id) },
        include: {
          receivedReviews: {
            select: {
              id: true,
              talentsAnswer: true,
              clientAnswer: true,
              createdAt: true,
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить отзывы о конкретном пользователе
  router.get('/:userId/reviews', async (req, res) => {
    try {
      const { userId } = req.params;

      const reviews = await prisma.review.findMany({
        where: { targetId: userId },
        select: {
          id: true,
          talentsAnswer: true,
          clientAnswer: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(reviews);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}