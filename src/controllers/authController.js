const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({ fullName, email, password: hashedPassword });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, isPremium: user.isPremium }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { googleId, email, fullName, profilePicture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }

    let user = await User.findOne({ where: { googleId } });

    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        user.googleId = googleId;
        if (!user.profilePicture && profilePicture) user.profilePicture = profilePicture;
        await user.save();
      } else {
        user = await User.create({ googleId, email, fullName, profilePicture });
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, isPremium: user.isPremium, profilePicture: user.profilePicture }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const appleLogin = async (req, res) => {
  try {
    const { appleId, email, fullName } = req.body;

    if (!appleId) {
      return res.status(400).json({ error: 'Apple ID is required' });
    }

    let user = await User.findOne({ where: { appleId } });

    if (!user) {
      if (email) {
        user = await User.findOne({ where: { email } });
        if (user) {
          user.appleId = appleId;
          await user.save();
        }
      }
      if (!user) {
        user = await User.create({
          appleId,
          email: email || `${appleId}@apple.privaterelay.com`,
          fullName: fullName || 'Apple User'
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Apple login successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, isPremium: user.isPremium }
    });

  } catch (error) {
    console.error('Apple login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getMe, googleLogin, appleLogin };