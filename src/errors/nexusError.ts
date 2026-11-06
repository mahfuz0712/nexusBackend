export default class NexusError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(
    message: string,
    statusCode = 500,
    errors?: any,
    isOperational = true
  ) {
    super(message);

    this.name = "NexusError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}