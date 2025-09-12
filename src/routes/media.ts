import { Router } from 'express';
import fetch from 'node-fetch';

export function mediaRoutes() {
  const router = Router();

  // Прокси для фотографий Telegram
  router.get('/telegram-photo/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        return res.status(500).json({ error: 'Bot token not configured' });
      }

      // Получаем информацию о файле
      const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoResponse.json();
      
      if (!fileInfo.ok) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Скачиваем файл
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
      const imageResponse = await fetch(fileUrl);
      
      if (!imageResponse.ok) {
        return res.status(404).json({ error: 'Failed to fetch image' });
      }

      // Определяем Content-Type
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Устанавливаем заголовки для кэширования
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Кэш на 24 часа
        'ETag': fileId
      });

      // Отдаем изображение
      const imageBuffer = await imageResponse.buffer();
      res.send(imageBuffer);
      
    } catch (error) {
      console.error('Error proxying Telegram photo:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}