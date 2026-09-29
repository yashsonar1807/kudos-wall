const env = require('../config/env');

/**
 * Custom application error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized Success Response Structure
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {*} [options.data=null]
 * @param {string} [options.message='Success']
 * @param {number} [options.statusCode=200]
 * @param {Object} [options.meta=null]
 */
const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200, meta = null } = {}) => {
  const responsePayload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    responsePayload.meta = meta;
  }

  return res.status(statusCode).json(responsePayload);
};

/**
 * Standardized Error Response Structure
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {string} [options.message='An unexpected error occurred']
 * @param {number} [options.statusCode=500]
 * @param {string} [options.errorCode='INTERNAL_ERROR']
 * @param {*} [options.errors=null]
 * @param {string} [options.stack=null]
 */
const sendError = (
  res,
  {
    message = 'An unexpected error occurred',
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    errors = null,
    stack = null,
  } = {}
) => {
  const responsePayload = {
    success: false,
    message,
    error: {
      code: errorCode,
    },
  };

  if (errors) {
    responsePayload.error.details = errors;
  }

  if (env.isDevelopment && stack) {
    responsePayload.error.stack = stack;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  ApiError,
  sendSuccess,
  sendError,
};
