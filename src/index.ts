import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { initBot } from './bot/bot';
import { setupRoutes } from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

setupRoutes(app, prisma);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

initBot(prisma);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Create tables if they don't exist (production only)
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Ensuring database schema is up to date...');
      try {
        // Try a simple query first to check if tables exist
        await prisma.user.findFirst();
        console.log('✅ Database schema is ready');
        
        // Try to remove unique constraint if it exists
        try {
          console.log('🔄 Removing unique constraint if exists...');
          await prisma.$executeRaw`DROP INDEX IF EXISTS "reviews_authorId_targetId_key"`;
          await prisma.$executeRaw`DROP INDEX IF EXISTS "Review_authorId_targetId_key"`;
          await prisma.$executeRaw`DROP INDEX IF EXISTS "reviews_author_id_target_id_key"`;
          console.log('✅ Unique constraint removal completed');
        } catch (constraintError) {
          console.log('⚠️ Unique constraint removal failed (may not exist):', (constraintError as Error).message);
        }
      } catch (error) {
        // If tables don't exist, run db push
        console.log('📋 Creating database tables...');
        const { execSync } = require('child_process');
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ Database schema created');
      }
    }
    
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();