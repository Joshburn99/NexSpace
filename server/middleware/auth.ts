import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, rolePermissions, permissions } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Extended Request type with user
export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Generate JWT tokens
export function generateTokens(userId: number, role: string) {
  const accessToken = jwt.sign(
    { userId, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware - checks if user is authenticated
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Check for token in header or session
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // Also check session for backwards compatibility
    const sessionUser = (req as any).user || (req.session as any)?.passport?.user;
    
    if (!token && !sessionUser) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    if (token) {
      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded || decoded.type !== 'access') {
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN' 
        });
      }
      
      // Fetch user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          code: 'USER_INACTIVE' 
        });
      }
      
      req.user = user;
      req.token = token;
    } else if (sessionUser) {
      // Use session user
      req.user = sessionUser;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    });
  }
}

// Authorization middleware - checks if user has required role(s)
export function authorize(...allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED' 
        });
      }
      
      const userRole = req.user.role;
      
      // Super admin bypasses all checks
      if (userRole === 'super_admin') {
        return next();
      }
      
      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
          code: 'UNAUTHORIZED',
          requiredRoles: allowedRoles,
          userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ 
        error: 'Authorization failed',
        code: 'AUTH_ERROR' 
      });
    }
  };
}

// Permission-based authorization
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED' 
        });
      }
      
      const userRole = req.user.role;
      
      // Super admin bypasses all checks
      if (userRole === 'super_admin') {
        return next();
      }
      
      // Get user's permissions from database
      const userPermissions = await db
        .select({
          name: permissions.name
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.role, userRole));
      
      const permissionNames = userPermissions.map(p => p.name);
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        permissionNames.includes(permission)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(p => 
          !permissionNames.includes(p)
        );
        
        return res.status(403).json({ 
          error: `Missing required permissions: ${missingPermissions.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions,
          missingPermissions,
          userPermissions: permissionNames
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        code: 'AUTH_ERROR' 
      });
    }
  };
}

// Optional authentication - doesn't fail if user is not authenticated
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionUser = (req as any).user || (req.session as any)?.passport?.user;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.type === 'access') {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);
        
        if (user && user.isActive) {
          req.user = user;
          req.token = token;
        }
      }
    } else if (sessionUser) {
      req.user = sessionUser;
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    console.error('Optional auth error:', error);
    next();
  }
}

// Refresh token endpoint handler
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token required',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN' 
      });
    }
    
    // Fetch user to ensure they still exist and are active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'User not found or inactive',
        code: 'USER_INACTIVE' 
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.id, user.role);
    
    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR' 
    });
  }
}

// Export role constants for consistency
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  FACILITY_MANAGER: 'facility_manager',
  INTERNAL_EMPLOYEE: 'internal_employee',
  EXTERNAL_STAFF: 'external_staff',
  CONTRACTOR: 'contractor'
} as const;

// Export common permission groups
export const PERMISSION_GROUPS = {
  DASHBOARD: ['dashboard.view', 'dashboard.analytics'],
  FACILITIES: ['facilities.view', 'facilities.create', 'facilities.edit', 'facilities.delete'],
  STAFF: ['staff.view', 'staff.create', 'staff.edit', 'staff.delete'],
  SHIFTS: ['shifts.view', 'shifts.create', 'shifts.edit', 'shifts.delete', 'shifts.assign'],
  ADMIN: ['users.view', 'users.manage', 'audit.view', 'impersonate']
} as const;