const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and paste your MongoDB Atlas connection string.');
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (e) {
    throw new Error(
      `Could not connect to MongoDB: ${e.message}\n` +
      '  - Check the username/password in MONGODB_URI (special characters in the password must be URL-encoded).\n' +
      '  - In Atlas > Network Access, allow your IP address (or 0.0.0.0/0 while testing).'
    );
  }
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
};
