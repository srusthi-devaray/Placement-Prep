// Central error handler: turns thrown errors into clean JSON responses.
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return res.end(); // e.g. in the middle of a streamed chat reply

  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  else if (err.name === 'CastError') { status = 400; message = `Invalid value for ${err.path}`; }
  else if (err.code === 11000) { status = 409; message = 'That already exists'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'File too large (max 15 MB)'; }
  else if (err.name === 'MulterError') { status = 400; message = err.message; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON'; }

  if (status >= 500) { console.error(err); message = 'Something went wrong on the server'; }
  res.status(status).json({ error: message });
};
