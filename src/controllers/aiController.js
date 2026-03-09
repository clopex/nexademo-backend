const ChatMessage = require('../models/ChatMessage');

const SYSTEM_PROMPT = `You are a helpful AI assistant inside NexaDemo app.
You help users with productivity, answer questions, and provide useful information.
Be concise, friendly and helpful. Keep responses under 3 sentences unless more detail is needed.`;

const chat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use only the most recent context and always append the current user prompt explicitly.
    const history = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const chronologicalHistory = history.reverse();
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chronologicalHistory.map((entry) => ({
        role: entry.role,
        content: entry.content
      })),
      { role: 'user', content: trimmedMessage }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 500,
        messages
      })
    });

    if (!groqResponse.ok) {
      throw new Error('Groq API failed');
    }

    const groqData = await groqResponse.json();
    const reply = groqData.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(503).json({ error: 'AI temporarily unavailable, please try again' });
    }

    await ChatMessage.bulkCreate([
      { userId, role: 'user', content: trimmedMessage },
      { userId, role: 'assistant', content: reply }
    ]);

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const clearChatHistory = async (req, res) => {
  try {
    await ChatMessage.destroy({ where: { userId: req.userId } });
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { chat, getChatHistory, clearChatHistory };
