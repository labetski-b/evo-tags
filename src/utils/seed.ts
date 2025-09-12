import { PrismaClient } from '@prisma/client';

const testUsers = [
  {
    telegramId: BigInt(999999001),
    username: 'testuser1',
    firstName: 'Анна',
    lastName: 'Иванова',
    photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b812c1b9?w=150&h=150&fit=crop&crop=face'
  },
  {
    telegramId: BigInt(999999002), 
    username: 'testuser2',
    firstName: 'Михаил',
    lastName: 'Петров',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    telegramId: BigInt(999999003),
    username: 'testuser3', 
    firstName: 'Елена',
    lastName: 'Сидорова',
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  {
    telegramId: BigInt(999999004),
    username: 'testuser4',
    firstName: 'Алексей',
    lastName: 'Козлов',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  }
];

const testReviews = [
  {
    authorIndex: 0,
    targetIndex: 1,
    talentsAnswer: 'Отличный аналитик, умеет работать с большими данными. Сильные навыки в SQL и Python. Всегда находит нестандартные решения для сложных задач.',
    clientAnswer: 'Финтех стартап или банк, которым нужна аналитика пользовательского поведения и оптимизация процессов.'
  },
  {
    authorIndex: 1,
    targetIndex: 0,
    talentsAnswer: 'Прекрасный UX/UI дизайнер с отличным чувством стиля. Умеет создавать интуитивные интерфейсы и проводить пользовательские исследования.',
    clientAnswer: 'Мобильное приложение для e-commerce или образовательная платформа, где важен пользовательский опыт.'
  },
  {
    authorIndex: 2,
    targetIndex: 3,
    talentsAnswer: 'Опытный backend разработчик, знает микросервисную архитектуру. Отличные навыки в Node.js и Docker. Очень ответственный и пунктуальный.',
    clientAnswer: 'Высоконагруженный сервис или корпоративное решение, где важна надежность и масштабируемость системы.'
  }
];

export async function seedTestData(providedPrisma?: PrismaClient) {
  const prisma = providedPrisma || new PrismaClient();
  
  try {
    console.log('🌱 Adding test users...');
    
    // Создаем тестовых пользователей
    const createdUsers = [];
    for (const user of testUsers) {
      const createdUser = await prisma.user.upsert({
        where: { telegramId: user.telegramId },
        create: user,
        update: user
      });
      createdUsers.push(createdUser);
      console.log(`✅ Created user: ${user.firstName} ${user.lastName}`);
    }
    
    // Создаем тестовые отзывы
    console.log('📝 Adding test reviews...');
    for (const review of testReviews) {
      await prisma.review.upsert({
        where: {
          authorId_targetId: {
            authorId: createdUsers[review.authorIndex].id,
            targetId: createdUsers[review.targetIndex].id
          }
        },
        create: {
          authorId: createdUsers[review.authorIndex].id,
          targetId: createdUsers[review.targetIndex].id,
          talentsAnswer: review.talentsAnswer,
          clientAnswer: review.clientAnswer
        },
        update: {
          talentsAnswer: review.talentsAnswer,
          clientAnswer: review.clientAnswer
        }
      });
      
      console.log(`✅ Created review from ${testUsers[review.authorIndex].firstName} to ${testUsers[review.targetIndex].firstName}`);
    }
    
    console.log('🎉 Test data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    if (!providedPrisma) {
      await prisma.$disconnect();
    }
  }
}

// Запуск если файл вызывается напрямую
if (require.main === module) {
  seedTestData();
}