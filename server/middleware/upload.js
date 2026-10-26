const multer = require('multer');

// Files are kept in memory (never written to disk). Max 15 MB each, up to 6 files.
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 6 }
});
