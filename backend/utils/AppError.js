// Error with an HTTP status code. Controllers respond with `statusCode`; anything else is a 500.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export default AppError;
