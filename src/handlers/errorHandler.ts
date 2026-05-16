import { Request, Response, NextFunction } from "express";

import ApiError from "../errors/ApiError";
import { errorResponse } from "../responses/errorResponse";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.error("Error:", err);

  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = undefined;
  let stack = undefined;

  // Custom application errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  // Development stack trace
  if (process.env.NODE_ENV === "development") {
    stack = err.stack;
  }

  return res.status(statusCode).json(
    errorResponse(
      message,
      errors,
      stack
    )
  );
};

export default errorHandler;