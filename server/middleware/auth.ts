import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'university_library_secure_jwt_secret_key_2026_x89';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      name?: string;
    };
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.', error: err.message });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const isAllowed = allowedRoles.map((r) => r.toUpperCase()).includes(userRole);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized for this resource.`,
      });
    }

    next();
  };
};
