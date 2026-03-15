import AppError from '../utils/AppError.js';

/**
 * Restrict access to specific roles.
 * Usage: authorize('admin', 'restaurant')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Role '${req.user.role}' is not authorized to access this route`, 403)
      );
    }
    next();
  };
};

export { authorize };
