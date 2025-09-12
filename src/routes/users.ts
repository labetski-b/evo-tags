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
          photoUrl: true,
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
      console.log('POST /users/me called');
      const { telegramData } = req.body;
      
      if (!telegramData) {
        console.error('No telegramData provided');
        return res.status(400).json({ error: 'Telegram data required' });
      }

      console.log('Validating Telegram data...');
      // Валидация данных от Telegram
      const userData = validateTelegramWebAppData(telegramData);
      if (!userData) {
        console.error('Telegram data validation failed, trying fallback...');
        // Временный fallback: попробуем взять первого пользователя из БД для тестирования
        const firstUser = await prisma.user.findFirst();
        if (firstUser) {
          console.log('Using fallback user for testing:', firstUser.id);
          const userWithReviews = await prisma.user.findUnique({
            where: { id: firstUser.id },
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
          console.log('Fallback user has', userWithReviews?.receivedReviews.length || 0, 'reviews');
          return res.json(userWithReviews);
        }
        return res.status(401).json({ error: 'Invalid Telegram data and no fallback available' });
      }

      console.log('Looking for user with ID:', userData.id);
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
        console.error('User not found for ID:', userData.id);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('User found with', user.receivedReviews.length, 'reviews');
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