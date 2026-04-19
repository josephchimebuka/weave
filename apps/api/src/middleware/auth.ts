import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      clientId: string;
    }
  }
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  const client = await prisma.client.findUnique({ where: { apiKey: key } });
  if (!client) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  req.clientId = client.id;
  next();
}
