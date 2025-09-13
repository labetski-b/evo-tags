import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateTelegramWebAppData(telegramData: string): TelegramUser | null {
  try {
    console.log('Validating Telegram data:', telegramData ? telegramData.substring(0, 100) + '...' : 'empty');
    
    if (!telegramData || telegramData.trim() === '') {
      console.error('Empty or null Telegram data provided');
      return null;
    }
    
    // В реальном приложении нужно валидировать подпись
    // Для упрощения пока просто парсим данные
    const urlParams = new URLSearchParams(telegramData);
    const userParam = urlParams.get('user');
    
    console.log('User param from URL:', userParam);
    
    if (!userParam) {
      console.error('No user data in Telegram data');
      return null;
    }

    let user;
    try {
      user = JSON.parse(decodeURIComponent(userParam));
    } catch (parseError) {
      console.error('Failed to parse user data JSON:', parseError);
      console.error('User param was:', userParam);
      return null;
    }
    
    console.log('Parsed user data:', user);
    
    // Базовая валидация структуры пользователя
    if (!user.id || !user.first_name) {
      console.error('Invalid user data structure - missing id or first_name:', user);
      return null;
    }

    // Проверяем, что ID можно конвертировать в число
    if (isNaN(Number(user.id))) {
      console.error('User ID is not a valid number:', user.id);
      return null;
    }

    console.log('User validation successful for ID:', user.id);
    return user;
  } catch (error) {
    console.error('Error parsing Telegram data:', error);
    console.error('Telegram data was:', telegramData);
    return null;
  }
}

export function validateTelegramWebAppDataSecure(telegramData: string, botToken: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(telegramData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    if (!hash) {
      console.error('No hash in Telegram data');
      return null;
    }

    // Создаем строку для проверки подписи
    const params: [string, string][] = [];
    urlParams.forEach((value, key) => {
      params.push([key, value]);
    });
    
    const dataCheckString = params
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем подпись
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравниваем подписи
    if (calculatedHash !== hash) {
      console.error('Invalid Telegram data signature');
      return null;
    }

    const userParam = urlParams.get('user');
    if (!userParam) {
      console.error('No user data in Telegram data');
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userParam));
    
    if (!user.id || !user.first_name) {
      console.error('Invalid user data structure');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
}