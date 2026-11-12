import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../constants/roles';

export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

export function signAccessToken(payload: JwtPayload, rememberMe: boolean): string {
  const expiresIn = rememberMe ? env.JWT_REMEMBER_EXPIRES : env.JWT_EXPIRES;
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
