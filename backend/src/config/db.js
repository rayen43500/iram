const mongoose = require('mongoose');
const env = require('./env');

async function connectDb() {
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connecte');
}

module.exports = { connectDb };
