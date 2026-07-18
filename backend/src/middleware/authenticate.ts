import { Request, Response, NextFunction } from 'express';
import { authService } from '../routes/auth/auth.service';
import { unauthorized } from '../utils/errors';
import { AuthUser } from '../routes/auth/auth.types';

/**
 * Express `Request` augmentation.
 *
 * Why: Lets controllers and downstream middleware access `req.user` with full
 * type safety after the `authenticate` middleware runs.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * JWT verification middleware.
 *
 * Why: Stateless auth. Extracts the Bearer token from the Authorization header,
 * verifies it with Supabase (admin client), and attaches the resolved user to
 * `req.user`. Rejects with 401 on missing/invalid tokens.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(unauthorized('Missing access token'));
  }

  authService
    .getUserFromToken(token)
    .then((user) => {
      if (!user) {
        return next(unauthorized('Invalid or expired token'));
      }
      req.user = user;
      next();
    })
    .catch((err) => next(err));
}
