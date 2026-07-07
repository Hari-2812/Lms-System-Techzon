import type { Request } from "express";

/**
 * Global authenticated request type
 * Extends Express Request so all default properties work:
 *
 * req.headers
 * req.cookies
 * req.params
 * req.body
 * req.query
 *
 */

export interface AuthenticatedRequest extends Request {
  user?: any;
}