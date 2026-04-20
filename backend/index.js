const app = require('./src/app');
const env = require('./src/config/env');
const { connectDb } = require('./src/config/db');
const { seedDatabase } = require('./src/seed');

async function start() {
  await connectDb();

  if (env.autoSeedOnStart) {
    await seedDatabase({ skipIfNotEmpty: true, skipConnect: true });
  }

  app.listen(env.port, () => {
    console.log(`Serveur backend demarre sur le port ${env.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
