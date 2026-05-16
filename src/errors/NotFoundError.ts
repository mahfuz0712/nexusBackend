import ApiError from "./ApiError";

export default class NotFoundError extends ApiError {
  constructor(message = "Resource Not Found", errors?: any) {
    super(message, 404, errors);
  }
}