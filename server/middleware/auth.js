const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils');

// Protects routes: expects "Authorization: Bearer <token>" and sets req.user = { id }.
module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch {
    next(new HttpError(401, 'Please log in'));
  }
};
