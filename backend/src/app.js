const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const creditRoutes = require('./routes/creditRoutes');
const requestRoutes = require('./routes/requestRoutes');
const estimationRoutes = require('./routes/estimationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.frontendOrigin === '*' ? true : env.frontendOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'credit-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/estimation', estimationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/documents', documentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur interne serveur' });
});

module.exports = app;
