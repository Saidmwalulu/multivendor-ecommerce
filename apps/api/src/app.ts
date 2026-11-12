import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { corsOptions } from './config/cors';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import exampleRoutes from './routes/example.routes';
import categoryRoutes from './routes/category.routes';
import subCategoryRoutes from './routes/subCategory.routes';
import storeRoutes from './routes/store.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';


const app: Application = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use(express.json()); //express.json({ limit: '10kb' })
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/examples', exampleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', subCategoryRoutes);
app.use('/api/store', storeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;