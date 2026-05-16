import { ErrorResponse } from "../types/response.types";

export const errorResponse = (
  message: string,
  errors?: any,
  stack?: string
): ErrorResponse => ({
  success: false,
  message,
  errors,
  stack,
});