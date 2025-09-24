import { Request } from "express";

import type { AuthenticatedRequestUser } from "../middleware/authMiddleware.js";

export interface AuthRequest extends Request {
  user?: AuthenticatedRequestUser;
}
