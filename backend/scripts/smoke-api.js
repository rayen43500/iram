/**
 * Test rapide des routes principales. Prérequis : MySQL + backend démarré (npm run dev).
 * Usage: node scripts/smoke-api.js
 */
const API = process.env.API_BASE || 'http://127.0.0.1:4000/api';
const HEALTH = process.env.HEALTH_URL || 'http://127.0.0.1:4000/health';

async function req(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status} ${path}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function main() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`OK  ${name}`);
    } catch (e) {
      results.push({ name, ok: false, error: e.message });
      console.error(`FAIL ${name}:`, e.message);
    }
  }

  await check('health', async () => {
    const res = await fetch(HEALTH);
    if (!res.ok) throw new Error(`health ${res.status}`);
  });

  let token;

  await check('login admin', async () => {
    const r = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bank.local', password: 'Admin@1234' }),
    });
    token = r.token;
    if (!token) throw new Error('token manquant');
  });

  const auth = { Authorization: `Bearer ${token}` };

  await check('GET /auth/me', () => req('/auth/me', { headers: auth }));
  await check('GET /credits/types', () => req('/credits/types', { headers: auth }));
  await check('GET /notifications', () => req('/notifications', { headers: auth }));
  await check('GET /simulations', () => req('/simulations', { headers: auth }));
  await check('GET /documents', () => req('/documents', { headers: auth }));
  await check('GET /auth/login-history', () => req('/auth/login-history', { headers: auth }));
  await check('GET /admin/analytics/summary', () => req('/admin/analytics/summary', { headers: auth }));
  await check('GET /admin/requests', () => req('/admin/requests?status=pending', { headers: auth }));

  await check('POST /estimation + amortissement', async () => {
    const types = await req('/credits/types', { headers: auth });
    if (!types.length) throw new Error('aucun type credit');
    const r = await req('/estimation', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        creditTypeId: types[0].id,
        amount: 10000,
        durationMonths: 36,
        salary: 2500,
      }),
    });
    if (!r.estimation?.amortizationSchedule?.length) {
      throw new Error('tableau amortissement absent');
    }
  });

  let clientToken;
  await check('login client', async () => {
    const r = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'client1@bank.local', password: 'Client@1234' }),
    });
    clientToken = r.token;
    if (!clientToken) throw new Error('token client manquant');
  });

  const clientAuth = { Authorization: `Bearer ${clientToken}` };

  await check('POST /estimation (client)', async () => {
    const types = await req('/credits/types', { headers: clientAuth });
    const r = await req('/estimation', {
      method: 'POST',
      headers: clientAuth,
      body: JSON.stringify({
        creditTypeId: types[0].id,
        amount: 8000,
        durationMonths: 24,
        salary: 2200,
      }),
    });
    if (!r.estimation?.monthlyPayment) throw new Error('estimation client invalide');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
