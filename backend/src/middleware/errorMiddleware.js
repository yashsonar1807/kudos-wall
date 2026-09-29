const { ApiError, sendError } = require('../utils/apiResponse');

/**
 * 404 Handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'RESOURCE_NOT_FOUND'
  );
  next(error);
};

/**
 * Centralized Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let errors = err.errors || null;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
    errorCode = 'INVALID_IDENTIFIER';
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${duplicatedField}. Must be unique.`;
    errorCode = 'DUPLICATE_KEY_ERROR';
  }

  // Handle JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
    errorCode = 'MALFORMED_JSON';
  }

  return sendError(res, {
    message,
    statusCode,
    errorCode,
    errors,
    stack: err.stack,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
