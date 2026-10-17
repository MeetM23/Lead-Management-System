import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendError } from './errorMiddleware.js';

// Authenticates the request. The user (and therefore the role) always comes from the database record
// behind the signed token, never from the token payload or the request.
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer')) {
    return sendError(res, new AppError('Not authorized, no token', 401));
  }

  let user;
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    user = await User.findForAuth(decoded.id);
  } catch (error) {
    console.error(error.message);
    return sendError(res, new AppError('Not authorized, token failed', 401));
  }

  if (!user) {
    return sendError(res, new AppError('Not authorized, user not found', 401));
  }

  if (user.isActive === false) {
    return sendError(res, new AppError('Account is deactivated', 403));
  }

  req.user = user;
  next();
};

export default protect;
