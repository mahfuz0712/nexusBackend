import ApiError from "./ApiError";

export default class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", errors?: any) {
    super(message, 401, errors);
  }
}