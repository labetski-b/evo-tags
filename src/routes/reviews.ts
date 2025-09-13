import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTelegramWebAppData } from '../utils/telegram';

export function reviewRoutes(prisma: PrismaClient) {
  const router = Router();

  // Создать новый отзыв
  router.post('/', async (req, res) => {
    try {
      const { telegramData, targetUserId, talentsAnswer, clientAnswer } = req.body;
      
      if (!telegramData || !targetUserId || !talentsAnswer || !clientAnswer) {
        return res.status(400).json({ 
          error: 'All fields are required: telegramData, targetUserId, talentsAnswer, clientAnswer' 
        });
      }

      // Валидация данных от Telegram
      const userData = validateTelegramWebAppData(telegramData);
      if (!userData) {
        return res.status(401).json({ error: 'Invalid Telegram data' });
      }

      // Найти автора отзыва
      const author = await prisma.user.findUnique({
        where: { telegramId: BigInt(userData.id) }
      });

      if (!author) {
        return res.status(404).json({ error: 'Author not found' });
      }

      // Проверить, что цель отзыва существует
      const target = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!target) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      // Проверить, что пользователь не оставляет отзыв о себе
      if (author.id === targetUserId) {
        return res.status(400).json({ error: 'Cannot review yourself' });
      }

      // Создать новый отзыв
      const review = await prisma.review.create({
        data: {
          authorId: author.id,
          targetId: targetUserId,
          talentsAnswer,
          clientAnswer
        }
      });

      res.json({ 
        success: true, 
        reviewId: review.id,
        message: 'Review saved successfully' 
      });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Check endpoint removed - multiple reviews are now allowed

  // Получить все отзывы для ленты
  router.get('/feed', async (req, res) => {
    try {
      const reviews = await prisma.review.findMany({
        include: {
          target: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Ограничиваем количество для производительности
      });

      res.json(reviews);
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}