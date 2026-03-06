require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const tipsRoutes = require('./src/routes/tips');
const aiRoutes = require('./src/routes/ai');
const paymentsRoutes = require('./src/routes/payments');
const agoraRoutes = require('./src/routes/agora');
const nexaRoutes = require('./src/routes/nexa');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/payments', paymentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/nexa', nexaRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'NexaDemo API is running!', version: '1.0' });
});

app.use('/api/tips', tipsRoutes);
app.use('/api/ai', aiRoutes);


async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Models synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

startServer();