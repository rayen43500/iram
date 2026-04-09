const app = require('./src/app');
const env = require('./src/config/env');
const { connectDb } = require('./src/config/db');

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Serveur backend demarre sur le port ${env.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
