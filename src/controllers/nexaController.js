const parseNexaCommand = async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const systemPrompt = `You are Nexa, a voice assistant inside NexaDemo app.
Parse user voice commands and return ONLY valid JSON, no explanation, no markdown, no code blocks.

Supported actions:
- create_voice_note: { "action": "create_voice_note", "parameters": { "content": "note text" } }
- open_ai_chat: { "action": "open_ai_chat", "parameters": { "message": "initial message" } }
- start_scan: { "action": "start_scan", "parameters": {} }
- make_call: { "action": "make_call", "parameters": { "contact": "contact name" } }
- search_places: { "action": "search_places", "parameters": { "query": "any places query the user asked for, such as coffee shops, gyms, pharmacies, hotels, restaurants, or any nearby place search" } }
- navigate: { "action": "navigate", "parameters": { "tab": "home|ai|premium|connect|profile" } }
- unknown: { "action": "unknown", "parameters": {} }`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ]
      })
    });

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content?.trim();

    if (!content) return res.status(503).json({ error: 'AI unavailable' });

    // Parse JSON from response
    let parsed;
try {
    // Pokušaj direktni parse
    parsed = JSON.parse(content);
} catch {
    // Pokušaj pronaći JSON unutar teksta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch {
            // Fallback — unknown command
            parsed = { action: 'unknown', parameters: {} };
        }
    } else {
        parsed = { action: 'unknown', parameters: {} };
    }
}

res.json(parsed);

  } catch (error) {
    console.error('Nexa parse error:', error);
    res.status(500).json({ error: 'Failed to parse command' });
  }
};

module.exports = { parseNexaCommand };
