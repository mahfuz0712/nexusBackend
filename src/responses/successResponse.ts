import { SuccessResponse } from "../types/response.types";

export const successResponse = <T>(
  data: T,
  message?: string
): SuccessResponse<T> => ({
  success: true,
  data,
  message,
});