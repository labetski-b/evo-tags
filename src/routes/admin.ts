import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function adminRoutes() {
  const router = Router();

  // Эндпоинт для обновления схемы базы данных
  router.post('/update-schema', async (req, res) => {
    try {
      console.log('Starting database schema update...');
      
      // Выполняем prisma db push для принудительного обновления схемы
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --force-reset');
      
      console.log('Schema update stdout:', stdout);
      if (stderr) {
        console.warn('Schema update stderr:', stderr);
      }
      
      res.json({ 
        success: true, 
        message: 'Database schema updated successfully',
        output: stdout
      });
    } catch (error) {
      console.error('Error updating schema:', error);
      res.status(500).json({ 
        error: 'Failed to update schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}