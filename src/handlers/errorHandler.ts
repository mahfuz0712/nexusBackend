// errorHandler.ts
import { Request, Response, NextFunction } from "express";
import ApiError from "../errors/ApiError";
import { errorResponse } from "../responses/errorResponse";

const routeNotFoundHandler = (req: Request, _: Response, next: NextFunction) => {
  next(new ApiError(`Route ${req.originalUrl} not found`, 404));
};

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = undefined;
  let stack = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  if (process.env.NODE_ENV === "development") {
    stack = err.stack;
  }

  return res.status(statusCode).json(errorResponse(message, errors, stack));
};

// Export as a tuple with explicit types so spread works correctly
const errorHandler: [
  (req: Request, res: Response, next: NextFunction) => void,
  (err: any, req: Request, res: Response, next: NextFunction) => void
] = [routeNotFoundHandler, globalErrorHandler];

export default errorHandler;