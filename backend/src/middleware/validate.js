import { AppError } from '../errors/AppError.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details));
  }
  // Express 5 makes req.query a getter-only property, so plain assignment would throw.
  Object.defineProperty(req, source, {
    value: result.data,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
};
