import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(error);
  res.status(500).json({
    error: {
      name: error?.name || "Internal Server Error",
      ...(error?.message ? { message: error?.message } : {}),
    },
  });
};
