import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string; username: string };

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
}
