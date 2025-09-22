import { NextFunction, Request, Response, Router } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response, _next: NextFunction) => {
  res.json({ success: true });
});

export { router as healthRouter };
