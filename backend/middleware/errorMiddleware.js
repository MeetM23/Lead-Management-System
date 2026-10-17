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

export const sendError = (res, error) => {
  const database = describeDatabaseError(error);
  const statusCode = database?.statusCode || error.statusCode || error.status || (error.name === "MulterError" ? 400 : 500);
  const message = database?.message || error.message || "Server Error";
  res.status(statusCode).json({ success: false, message });
};

// Express error middleware for errors that reach next(err)
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  sendError(res, err);
};
