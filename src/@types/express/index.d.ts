import type { AuthenticatedRequestUser } from "../../middleware/authMiddleware.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
      rawBody?: Buffer;
    }
  }
}

export {};
