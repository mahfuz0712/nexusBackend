import ApiError from "./ApiError";

export default class BadRequestError extends ApiError {
  constructor(message = "Bad Request", errors?: any) {
    super(message, 400, errors);
  }
}