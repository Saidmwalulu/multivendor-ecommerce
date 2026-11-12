import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface ZodSchemaLike<T> {
  parse: (value: unknown) => T;
}

@Injectable()
export class ZodValidationPipe<T = unknown> implements PipeTransform {
  constructor(private schema: ZodSchemaLike<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error: any) {
      if (error && Array.isArray(error.issues)) {
        const errors = error.issues.map((i: any) => ({ field: i.path.join('.'), message: i.message }));
        throw new BadRequestException({ success: false, message: 'Validation failed', errors });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}