import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userExistsByUsername, createUser, findUserByUsername } from '../models/User';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PRODUCTION,
  sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000
};

function generateToken(userId: string, username: string): string {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password required' });
      return;
    }

    const exists = await userExistsByUsername(username);
    if (exists) {
      res.status(400).json({ success: false, message: 'Username already taken' });
      return;
    }

    const hashed  = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, hashed);

    const token = generateToken(newUser.id, username);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ success: true });

  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, username);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true });

  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true });
}
