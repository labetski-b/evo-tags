# EVO Tags - Telegram Bot с Мини-Приложением

Telegram-бот с встроенным мини-приложением для анонимных отзывов между пользователями.

## Функционал

- 📱 Telegram-бот для регистрации и запуска мини-приложения
- 🌐 Web App для просмотра профилей и написания отзывов
- 📝 Система анонимных отзывов по двум вопросам:
  - Таланты, силы, компетенции, темы
  - Какого клиента бы привели?
- 🗄️ PostgreSQL для хранения данных
- 🚀 Готов к деплою на Railway

## Технический стек

- **Backend**: Node.js + TypeScript + Express
- **Bot**: node-telegram-bot-api
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: React + TypeScript + Telegram Web App SDK
- **Deploy**: Railway

## Установка и запуск

### Локальная разработка

1. Клонировать репозиторий:
```bash
git clone <repository-url>
cd evo-tags
```

2. Установить зависимости:
```bash
npm install
```

3. Настроить переменные окружения:
```bash
cp .env.example .env
# Отредактировать .env файл
```

4. Настроить базу данных:
```bash
npm run db:push
```

5. Запустить в режиме разработки:
```bash
npm run dev
```

### Деплой на Railway

1. Подключить GitHub репозиторий к Railway
2. Добавить PostgreSQL сервис
3. Настроить переменные окружения в Railway:
   - `TELEGRAM_BOT_TOKEN`
   - `DATABASE_URL` (автоматически от PostgreSQL)
   - `WEBAPP_URL` (URL приложения на Railway)
   - `NODE_ENV=production`

4. Railway автоматически задеплоит приложение

## Переменные окружения

### Railway Production
В Railway настройте следующие переменные:
- `TELEGRAM_BOT_TOKEN` - токен бота от @BotFather
- `DATABASE_URL` - автоматически создается PostgreSQL сервисом
- `WEBAPP_URL` - `https://your-app-name.up.railway.app`
- `NODE_ENV=production`

### Local Development  
Создайте `.env` файл:
- `TELEGRAM_BOT_TOKEN` - токен бота от @BotFather
- `DATABASE_URL` - локальная PostgreSQL БД
- `WEBAPP_URL=http://localhost:3000`
- `PORT=3000`
- `NODE_ENV=development`

## Структура проекта

```
├── src/
│   ├── bot/           # Логика Telegram-бота
│   ├── routes/        # API роуты
│   ├── models/        # Модели данных
│   └── utils/         # Утилиты
├── public/            # Статические файлы мини-приложения
├── prisma/           # Схема базы данных
├── railway.json      # Конфигурация Railway
└── Procfile         # Процессы для деплоя
```

## API Endpoints

- `GET /api/users` - получить список пользователей
- `GET /api/users/:id/reviews` - получить отзывы о пользователе  
- `POST /api/reviews` - создать новый отзыв
- `GET /api/me` - получить данные текущего пользователя

## Разработка

Для разработки фронтенда используется Telegram Web App SDK. Мини-приложение доступно по адресу `/` и интегрируется с Telegram через WebApp API.

## Лицензия

MIT