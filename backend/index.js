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

  // Imprimer les identifiants de test en console (CMD)
  const User = require('./src/models/User');
  try {
    const users = await User.findAll({ attributes: ['email', 'role', 'fullName', 'accountType'] });
    console.log('\n================================================================================');
    console.log('                 IDENTIFIANTS DES COMPTES CRÉÉS (RÉEL TUNISIE)');
    console.log('================================================================================');
    for (const u of users) {
      const defaultPwd = u.role === 'admin' ? 'Admin@1234' : 'Client@1234';
      const typeLabel = u.role === 'admin' ? 'Administrateur' : (u.accountType === 'professionnel' ? 'Client Personnel' : 'Client Normal');
      console.log(`- Role: ${u.role.toUpperCase().padEnd(6)} | Type: ${typeLabel.padEnd(14)} | Nom: ${u.fullName.padEnd(20)} | Email: ${u.email.padEnd(30)} | Mdp: ${defaultPwd}`);
    }
    console.log('================================================================================\n');
  } catch (err) {
    console.error('Erreur lors de l\'affichage des identifiants:', err);
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Serveur backend demarre sur 0.0.0.0:${env.port} (acces LAN pour telephone)`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
