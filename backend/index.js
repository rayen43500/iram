const app = require('./src/app');
const env = require('./src/config/env');
const { connectDb } = require('./src/config/db');
const { seedDatabase, ensureCreditTypes } = require('./src/seed');

async function start() {
  await connectDb();
  await ensureCreditTypes();

  if (env.autoSeedOnStart) {
    await seedDatabase({ skipIfNotEmpty: true, skipConnect: true });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Serveur backend demarre sur 0.0.0.0:${env.port} (acces LAN pour telephone)`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
