import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';

const token = process.env.TELEGRAM_BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!webappUrl) {
  throw new Error('WEBAPP_URL is required');
}

let bot: TelegramBot;

export function initBot(prisma: PrismaClient) {
  bot = new TelegramBot(token!, { polling: true });

  // Команда /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    if (!user) return;

    try {
      // Получаем фото профиля пользователя
      let photoUrl = null;
      try {
        const userPhotos = await bot.getUserProfilePhotos(user.id, { limit: 1 });
        if (userPhotos.photos.length > 0) {
          const photo = userPhotos.photos[0][0]; // Берем первое фото в лучшем качестве
          // Сохраняем ссылку на наш прокси-эндпоинт
          photoUrl = `/api/media/telegram-photo/${photo.file_id}`;
        }
      } catch (photoError) {
        console.log('Could not get user photo:', photoError instanceof Error ? photoError.message : 'Unknown error');
      }

      // Создаем или обновляем пользователя в базе
      await prisma.user.upsert({
        where: { telegramId: BigInt(user.id) },
        create: {
          telegramId: BigInt(user.id),
          username: user.username || null,
          firstName: user.first_name,
          lastName: user.last_name || null,
          photoUrl,
        },
        update: {
          username: user.username || null,
          firstName: user.first_name,
          lastName: user.last_name || null,
          photoUrl,
        },
      });

      const welcomeMessage = `👋 Добро пожаловать в EVO Tags!

Здесь вы можете:
• Просматривать профили участников
• Читать отзывы о себе и других
• Оставлять анонимные отзывы

Нажмите кнопку ниже, чтобы открыть приложение:`;

      await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🌟 Открыть EVO Tags',
                web_app: { url: webappUrl! }
              }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error in /start command:', error);
      await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка callback query от Web App
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    await bot.answerCallbackQuery(query.id);
  });

  // Обработка данных от Web App
  bot.on('web_app_data', async (msg) => {
    const chatId = msg.chat.id;
    const data = JSON.parse(msg.web_app_data?.data || '{}');
    
    console.log('Received web app data:', data);
    
    // Здесь можно обработать данные, если нужно
    await bot.sendMessage(chatId, 'Данные получены! ✅');
  });

  console.log('🤖 Telegram bot started');
}

export { bot };