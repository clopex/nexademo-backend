const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Daily Tip model - define inline
const DailyTip = sequelize.define('DailyTip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tip: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'daily_tips',
  timestamps: true
});

const FALLBACK_TIP = "Try scanning any product with AI Camera to instantly get detailed information about it.";

const getDailyTip = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if we already have a tip for today
    let tipRecord = await DailyTip.findOne({ where: { date: today } });

    if (tipRecord) {
      return res.json({ tip: tipRecord.tip, date: tipRecord.date, cached: true });
    }

    // Generate new tip with OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a smart personal assistant app called NexaDemo. The app has features: AI camera object detection, AI chat, voice to text, premium subscriptions, and video calls. Generate short, practical, engaging tips about using the app or related productivity advice. Keep it under 2 sentences.'
          },
          {
            role: 'user',
            content: `Generate a unique tip of the day for ${today}. Make it different from common tips. Be specific and actionable.`
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API failed');
    }

    const openaiData = await openaiResponse.json();
    const generatedTip = openaiData.choices[0].message.content.trim();

    // Save to database
    tipRecord = await DailyTip.create({ tip: generatedTip, date: today });

    res.json({ tip: tipRecord.tip, date: tipRecord.date, cached: false });

  } catch (error) {
    console.error('Daily tip error:', error);
    // Return fallback tip on any error
    res.json({ tip: FALLBACK_TIP, date: new Date().toISOString().split('T')[0], cached: false });
  }
};

module.exports = { getDailyTip, DailyTip };