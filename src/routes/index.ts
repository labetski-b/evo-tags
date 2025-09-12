import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { userRoutes } from './users';
import { reviewRoutes } from './reviews';
import { adminRoutes } from './admin';

export function setupRoutes(app: Express, prisma: PrismaClient) {
  // API prefix
  const apiPrefix = '/api';
  
  // User routes
  app.use(`${apiPrefix}/users`, userRoutes(prisma));
  
  // Review routes
  app.use(`${apiPrefix}/reviews`, reviewRoutes(prisma));
  
  // Admin routes (only for development)
  app.use(`${apiPrefix}/admin`, adminRoutes(prisma));
  
  // Health check
  app.get(`${apiPrefix}/health`, (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
}