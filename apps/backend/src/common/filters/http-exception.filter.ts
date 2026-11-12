import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const message = typeof body === 'string' ? body : (body as any)?.message ?? 'Internal server error';
    const errors = (body as any)?.errors;

    // Always log the real error server-side, regardless of what the client sees
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${req.method} ${req.originalUrl} — ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
  }
}
