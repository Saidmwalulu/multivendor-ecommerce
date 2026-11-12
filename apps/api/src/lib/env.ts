import "dotenv/config"

const get = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',

  
  CLIENT_URL: get('CLIENT_URL'),
  API_URL: get('API_URL'),
  APP_NAME: process.env.APP_NAME || 'My App',

  JWT_SECRET: get('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',

  COOKIE_KEY_1: get('COOKIE_KEY_1'),
  COOKIE_KEY_2: get('COOKIE_KEY_2'),

  RESEND_API_KEY: get('RESEND_API_KEY'),
  RESEND_FROM: get('RESEND_FROM'),

  GOOGLE_CLIENT_ID: get('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: get('GOOGLE_CLIENT_SECRET'),

  CLOUDINARY_CLOUD_NAME: get('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: get('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: get('CLOUDINARY_API_SECRET'),

  DATABASE_URL: get('DATABASE_URL'),
};