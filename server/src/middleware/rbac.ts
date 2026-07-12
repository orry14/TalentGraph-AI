import { Request, Response, NextFunction } from 'express';

export type AppRole = 'admin' | 'manager' | 'employee';

/**
 * Middleware to protect routes based on mocked RBAC.
 * In production, this would decode a JWT and fetch the user's role from Supabase.
 * For this ideation phase, we read the role from the 'x-mock-role' header.
 */
export const requireRole = (...allowedRoles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Read the mocked role from headers
    const userRole = (req.headers['x-mock-role'] as string)?.toLowerCase() as AppRole;
    
    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized: No mock role provided.' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: Access requires one of the following roles: ${allowedRoles.join(', ')}` });
    }

    // Attach mock user info to request for downstream usage
    // For ideation, we also pass user ID and manager status if needed
    (req as any).user = {
      role: userRole,
      id: req.headers['x-mock-user-id'] || null
    };

    next();
  };
};
