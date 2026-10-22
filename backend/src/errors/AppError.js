export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const NotFound = (what) => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const Conflict = (code, msg) => new AppError(409, code, msg);
export const Forbidden = (msg = 'Not allowed') => new AppError(403, 'FORBIDDEN', msg);
export const Unauthorized = (code, msg) => new AppError(401, code, msg);
