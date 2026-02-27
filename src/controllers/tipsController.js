const DailyTip = require('../models/DailyTip');

const FALLBACK_TIP = "Try scanning any product with AI Camera to instantly get detailed information about it.";

const getDailyTip = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let tipRecord = await DailyTip.findOne({ where: { date: today } });

    if (tipRecord) {
      return res.json({ tip: tipRecord.tip, date: tipRecord.date, cached: true });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a smart personal assistant app called NexaDemo. The app has features: AI camera object detection, AI chat, voice to text, premium subscriptions, and video calls. Generate short, practical, engaging tips. Maximum 1 sentence. No quotes. No date prefix. Just the tip text directly.'
          },
          {
            role: 'user',
            content: `Generate a unique tip of the day for ${today}. Make it different from common tips. Be specific and actionable.`
          }
        ]
      })
    });

    if (!groqResponse.ok) throw new Error('Groq API failed');

    const groqData = await groqResponse.json();
    const generatedTip = groqData.choices[0].message.content.trim();

    tipRecord = await DailyTip.create({ tip: generatedTip, date: today });

    res.json({ tip: tipRecord.tip, date: tipRecord.date, cached: false });

  } catch (error) {
    console.error('Daily tip error:', error);
    res.json({ tip: FALLBACK_TIP, date: new Date().toISOString().split('T')[0], cached: false });
  }
};

const deleteTodayTip = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  await DailyTip.destroy({ where: { date: today } });
  res.json({ message: 'Deleted' });
};

module.exports = { getDailyTip, deleteTodayTip };