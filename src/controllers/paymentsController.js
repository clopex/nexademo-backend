const Stripe = require('stripe');
const User = require('../models/User');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PREMIUM_PRICE = 499; // $4.99 u centima

// ─── Create Payment Intent ────────────────────────────────
const createPaymentIntent = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isPremium) {
      return res.status(400).json({ error: 'User is already premium' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PREMIUM_PRICE,
      currency: 'usd',
      metadata: {
        userId: user.id,
        email: user.email
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: PREMIUM_PRICE
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Confirm Payment (upgrade to premium) ────────────────
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Verify userId matches
    if (paymentIntent.metadata.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Upgrade user to premium
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isPremium: true });

    res.json({
      message: 'Payment confirmed - Premium activated!',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isPremium: user.isPremium
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Get Payment History ──────────────────────────────────
const getPaymentHistory = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10
    });

    // Filter by userId from metadata
    const userPayments = paymentIntents.data
      .filter(pi => pi.metadata.userId === req.userId)
      .map(pi => ({
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        createdAt: new Date(pi.created * 1000).toISOString()
      }));

    res.json({ payments: userPayments });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const activatePremium = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isPremium: true });

    res.json({
      message: 'Premium activated!',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isPremium: user.isPremium
      }
    });
  } catch (error) {
    console.error('Activate premium error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createPaymentIntent, confirmPayment, getPaymentHistory, activatePremium };
