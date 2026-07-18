import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { badRequest } from './errors';

/**
 * Validate `req.body` against a Zod schema and replace it with the parsed
 * (typed) value. Throws a 400 on failure so the central error handler can
 * serialize the field errors.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as T;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest('Validation failed', err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validate `req.query` against a Zod schema and replace it with the parsed
 * (typed, coerced) value. Used for GET endpoints with cursor/limit params.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as T & typeof req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest('Validation failed', err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}
