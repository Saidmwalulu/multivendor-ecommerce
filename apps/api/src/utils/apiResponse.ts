import { Response } from 'express';

interface SuccessPayload<T> {
  message: string;
  data?: T;
  statusCode?: number;
}

interface FailurePayload {
  message: string;
  errors?: unknown[];
  statusCode?: number;
  stack?: string;
}

export function sendSuccess<T>(res: Response, { message, data, statusCode = 200 }: SuccessPayload<T>) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
  });
}

export function sendFailure(res: Response, { message, errors = [], statusCode = 500, stack }: FailurePayload) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(stack ? { stack } : {}),
  });
}
