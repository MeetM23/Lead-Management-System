import AppError from "../utils/AppError.js";
import { sendError } from "./errorMiddleware.js";

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, new AppError("Forbidden: You do not have the required role to access this resource", 403));
    }
    next();
  };
};

export default authorize;
