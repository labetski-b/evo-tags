import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { userRoutes } from './users';
import { reviewRoutes } from './reviews';
import { adminRoutes } from './admin';
import { mediaRoutes } from './media';

export function setupRoutes(app: Express, prisma: PrismaClient) {
  // API prefix
  const apiPrefix = '/api';
  
  // User routes
  app.use(`${apiPrefix}/users`, userRoutes(prisma));
  
  // Review routes
  app.use(`${apiPrefix}/reviews`, reviewRoutes(prisma));
  
  // Admin routes (only for development)
  app.use(`${apiPrefix}/admin`, adminRoutes());
  
  // Media proxy routes
  app.use(`${apiPrefix}/media`, mediaRoutes());
  
  // Health check
  app.get(`${apiPrefix}/health`, (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
}