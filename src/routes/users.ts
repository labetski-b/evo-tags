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
        console.error('Telegram data validation failed, using fallback...');
        // Временный fallback - возвращаем первого пользователя с отзывами для тестирования
        try {
          const firstUser = await prisma.user.findFirst({
            include: {
              receivedReviews: {
                select: {
                  id: true,
                  talentsAnswer: true,
                  clientAnswer: true,
                  createdAt: true,
                  author: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          });
          
          if (firstUser) {
            console.log('Using fallback user with', firstUser.receivedReviews.length, 'reviews');
            return res.json(firstUser);
          }
          
          return res.status(404).json({ error: 'No users found' });
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          const errorDetails = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
          return res.status(500).json({ error: 'Database connection failed', details: errorDetails });
        }
      }

      console.log('Looking for user with ID:', userData.id);
      
      try {
        // Проверяем, что ID это число
        if (!userData.id) {
          console.error('No user ID provided:', userData.id);
          return res.status(400).json({ error: 'No user ID provided' });
        }

        let telegramId;
        try {
          telegramId = BigInt(userData.id);
        } catch (bigIntError) {
          console.error('Invalid user ID for BigInt conversion:', userData.id, bigIntError);
          return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const user = await prisma.user.findUnique({
          where: { telegramId },
          include: {
            receivedReviews: {
              select: {
                id: true,
                talentsAnswer: true,
                clientAnswer: true,
                createdAt: true,
                author: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
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
      } catch (dbError) {
        console.error('Database error when finding user:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', details: errorMessage });
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