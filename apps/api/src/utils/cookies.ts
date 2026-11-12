import { Response } from 'express';
import { env, isProd } from '../config/env';
import { COOKIE_MAX_AGE_DEFAULT_MS, COOKIE_MAX_AGE_REMEMBER_MS } from '../constants/tokens';

export function setAuthCookie(res: Response, token: string, rememberMe: boolean): void {
  const maxAge = rememberMe ? COOKIE_MAX_AGE_REMEMBER_MS : COOKIE_MAX_AGE_DEFAULT_MS;

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  });
}
