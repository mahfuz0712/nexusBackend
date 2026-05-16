import ApiError from "./ApiError";

export default class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", errors?: any) {
    super(message, 403, errors);
  }
}