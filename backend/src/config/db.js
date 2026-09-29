const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    if (!env.isTest) {
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Runtime connection error:`, err);
    });

    mongoose.connection.on('disconnected', () => {
      if (!env.isTest) {
        console.warn(`[MongoDB] Connection disconnected.`);
      }
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection failure: ${error.message}`);
    if (!env.isTest) {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (!env.isTest) {
      console.log(`[MongoDB] Connection closed cleanly.`);
    }
  } catch (error) {
    console.error(`[MongoDB] Error during disconnect: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
};
