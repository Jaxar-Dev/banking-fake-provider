import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const payments = new Map();

// Helper to simulate latency/error
const simulate = async (req, res, next) => {
  const delay = req.header('X-Simulate-Latency') || 0;
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));

  const shouldFail = req.header('X-Simulate-Error') === 'true';
  if (shouldFail) return res.status(400).json({ error: 'SIMULATED_PROVIDER_ERROR' });

  next();
};

app.post('/provider/payments', simulate, (req, res) => {
  const { amount, currency } = req.body;
  const providerPaymentId = `psp_${uuidv4().split('-')[0]}`;
  
  const payment = {
    id: providerPaymentId,
    amount,
    currency,
    status: 'CREATED'
  };
  
  payments.set(providerPaymentId, payment);
  res.status(201).json(payment);
});

app.post('/provider/payments/:id/authorize', simulate, (req, res) => {
  const { id } = req.params;
  if (!payments.has(id)) return res.status(404).json({ error: 'NOT_FOUND' });

  const payment = payments.get(id);
  payment.status = 'AUTHORIZED';
  res.json(payment);
});

app.post('/provider/payments/:id/capture', simulate, (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!payments.has(id)) return res.status(404).json({ error: 'NOT_FOUND' });

  const payment = payments.get(id);
  payment.status = 'CAPTURED';
  payment.capturedAmount = amount || payment.amount;
  res.json(payment);
});

app.post('/provider/payments/:id/refund', simulate, (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!payments.has(id)) return res.status(404).json({ error: 'NOT_FOUND' });

  res.json({ status: 'REFUNDED', amount });
});

app.get('/provider/payments/:id', (req, res) => {
  const { id } = req.params;
  if (!payments.has(id)) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(payments.get(id));
});

export default app;
