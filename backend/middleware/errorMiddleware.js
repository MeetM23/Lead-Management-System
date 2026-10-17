// Single place that turns an error into the standard failure response: { success: false, message }.
// Errors carry their HTTP status (AppError, body-parser); anything else is a 500.

// Known database errors get a clear client message; any other database error is reported generically
// (its raw text names tables and columns and must not be sent to clients).
const describeDatabaseError = (error) => {
  if (error.code === "P2025") return { statusCode: 404, message: "Record not found" };
  if (error.code === "P2000") return { statusCode: 400, message: "A value is too long" };
  if (error.name?.startsWith("PrismaClient")) {
    console.error("Database error:", error.code || error.name);
    return { statusCode: 500, message: "Database error" };
  }
  return null;
};

// Errors that carry a status on purpose (AppError, body-parser, upload errors) show their own message.
// Anything else is unexpected: the client gets a generic message and only the error's type is logged,
// because its text can contain internal details or data.
export const sendError = (res, error) => {
  const database = describeDatabaseError(error);
  const expected = database || error.statusCode || error.status || error.name === "MulterError";

  if (!expected) console.error("Unexpected error:", error.name);

  const statusCode = database?.statusCode || error.statusCode || error.status || (error.name === "MulterError" ? 400 : 500);
  res.status(statusCode).json({ success: false, message: database?.message || (expected ? error.message : "Server error") });
};

// Express error middleware for errors that reach next(err)
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  sendError(res, err);
};
