const ChatMessage = require('../models/ChatMessage');

const SYSTEM_PROMPT = `You are a helpful AI assistant inside NexaDemo app.
You help users with productivity, answer questions, and provide useful information.
Be concise, friendly and helpful. Keep responses under 3 sentences unless more detail is needed.`;

const SIMPLE_GREETINGS = new Set(['hi', 'hello', 'hey', 'yo', 'sup', 'good morning', 'good afternoon', 'good evening']);
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 1200;

class AIProviderError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'AIProviderError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function isSimpleGreeting(message) {
  const normalized = message.toLowerCase().replace(/[!?.]/g, '').trim();
  return SIMPLE_GREETINGS.has(normalized);
}

function sanitizeContent(content) {
  return String(content ?? '').trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH);
}

function buildMessages(historyEntries, latestUserMessage) {
  const historyMessages = historyEntries
    .map((entry) => ({
      role: entry.role,
      content: sanitizeContent(entry.content)
    }))
    .filter((entry) => ['user', 'assistant'].includes(entry.role) && entry.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...historyMessages,
    { role: 'user', content: latestUserMessage }
  ];
}

function providerErrorMessage(payloadText) {
  if (!payloadText) {
    return 'AI temporarily unavailable';
  }

  try {
    const payload = JSON.parse(payloadText);
    return payload?.error?.message || payload?.error || payloadText;
  } catch {
    return payloadText;
  }
}

async function requestChatCompletion(messages) {
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
    const payloadText = await groqResponse.text();
    throw new AIProviderError(
      providerErrorMessage(payloadText),
      groqResponse.status,
      payloadText.slice(0, 500)
    );
  }

  const groqData = await groqResponse.json();
  return groqData.choices?.[0]?.message?.content?.trim();
}

const chat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;
    const trimmedMessage = sanitizeContent(message);

    if (!trimmedMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const shouldUseHistory = isSimpleGreeting(trimmedMessage) === false;
    const history = shouldUseHistory
      ? await ChatMessage.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: MAX_HISTORY_MESSAGES
        })
      : [];

    const chronologicalHistory = history.reverse();
    let reply;

    try {
      reply = await requestChatCompletion(buildMessages(chronologicalHistory, trimmedMessage));
    } catch (error) {
      const canRetryWithoutHistory =
        error instanceof AIProviderError &&
        chronologicalHistory.length > 0;

      if (!canRetryWithoutHistory) {
        throw error;
      }

      console.warn('Retrying AI chat without history after provider failure', {
        userId,
        providerStatus: error.statusCode,
        details: error.details
      });

      reply = await requestChatCompletion(buildMessages([], trimmedMessage));
    }

    if (!reply) {
      return res.status(503).json({ error: 'AI temporarily unavailable, please try again' });
    }

    await ChatMessage.bulkCreate([
      { userId, role: 'user', content: trimmedMessage },
      { userId, role: 'assistant', content: reply }
    ]);

    res.json({ reply });
  } catch (error) {
    if (error instanceof AIProviderError) {
      console.error('Chat provider error:', {
        statusCode: error.statusCode,
        message: error.message,
        details: error.details
      });
      return res.status(503).json({
        error: 'AI temporarily unavailable, please try again. If it keeps happening, clear chat history.'
      });
    }

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
