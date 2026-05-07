const logger = require('../utils/logger');

module.exports = (err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) logger.error(err);
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.details,
  });
};
