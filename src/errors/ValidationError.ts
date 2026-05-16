import ApiError from "./ApiError";

export default class ValidationError extends ApiError {
  constructor(message = "Validation Failed", errors?: any) {
    super(message, 422, errors);
  }
}