import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import buildRoutes from './routes/buildRoutes';
import chatRoutes from './routes/chatRoutes';
import projectRoutes from './routes/projectRoutes';
import testRoutes from './routes/testRoutes';

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.APP_URL || ''
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many attempts, please try again later' }
});

app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api',      buildRoutes);
app.use('/api',      chatRoutes);
app.use('/api',      projectRoutes);
app.use('/api',      testRoutes);

export default app;
