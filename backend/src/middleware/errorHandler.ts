import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/errors";

// Wrap async route handlers so thrown/rejected errors reach the error middleware
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// Consistent JSON error shape for every error type in the app
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { message: err.message, details: err.details ?? null },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  // Prisma unique constraint violation
  if (typeof err === "object" && err !== null && (err as any).code === "P2002") {
    return res.status(409).json({
      error: { message: "A record with this value already exists", details: (err as any).meta },
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { message: "Internal server error" },
  });
}
