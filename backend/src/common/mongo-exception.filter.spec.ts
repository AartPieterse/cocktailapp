import {
  ArgumentsHost,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { MongoExceptionFilter } from './mongo-exception.filter';

function mockHost() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('MongoExceptionFilter', () => {
  const filter = new MongoExceptionFilter();

  it('passes an HttpException through with its own status', () => {
    const { host, res } = mockHost();
    filter.catch(new NotFoundException('Cocktail x not found'), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('preserves the status of a thrown ConflictException', () => {
    const { host, res } = mockHost();
    filter.catch(new ConflictException('in gebruik'), host);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps a duplicate-key error (11000) to 409', () => {
    const { host, res } = mockHost();
    filter.catch({ code: 11000, message: 'dup' }, host);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps a Mongoose CastError to 400', () => {
    const { host, res } = mockHost();
    filter.catch(new MongooseError.CastError('ObjectId', 'nope', 'id'), host);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('falls back to 500 for unknown errors', () => {
    const { host, res } = mockHost();
    filter.catch(new Error('boom'), host);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
