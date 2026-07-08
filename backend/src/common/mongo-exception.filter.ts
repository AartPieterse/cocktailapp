import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

/**
 * Translates the errors that leak out of Mongoose/Mongo into clean HTTP responses,
 * so a bad id or duplicate name is a 400/404/409 instead of an opaque 500.
 * HttpExceptions thrown by the app pass through unchanged.
 */
@Catch()
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res
        .status(status)
        .json(this.body(status, exception.getResponse()));
    }

    // Duplicate key (unique index violation), e.g. an ingredient name that already exists.
    if (this.isDuplicateKey(exception)) {
      const status = HttpStatus.CONFLICT;
      return res.status(status).json(this.body(status, 'Bestaat al'));
    }

    if (exception instanceof MongooseError.CastError) {
      const status = HttpStatus.BAD_REQUEST;
      return res
        .status(status)
        .json(this.body(status, `Ongeldige waarde voor "${exception.path}"`));
    }

    if (exception instanceof MongooseError.ValidationError) {
      const status = HttpStatus.BAD_REQUEST;
      const messages = Object.values(exception.errors).map((e) => e.message);
      return res.status(status).json(this.body(status, messages));
    }

    this.logger.error('Unhandled exception', exception as Error);
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(status).json(this.body(status, 'Er ging iets mis'));
  }

  private isDuplicateKey(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: number }).code === 11000
    );
  }

  private body(status: number, message: unknown) {
    // Arrays (e.g. ValidationError messages) and primitives go under `message`;
    // plain objects (an HttpException's response payload) are merged as-is.
    const payload =
      typeof message === 'object' && message !== null && !Array.isArray(message)
        ? message
        : { message };
    return { statusCode: status, ...payload };
  }
}
