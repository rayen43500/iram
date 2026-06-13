const { handleChat } = require('../utils/chatbotService');

async function chat(req, res) {
  const { message = '' } = req.body;
  try {
    const result = await handleChat(req.user, message);
    return res.json(result);
  } catch (err) {
    console.error('[chatbot]', err);
    return res.status(500).json({ message: 'Assistant temporairement indisponible.' });
  }
}

module.exports = {
  chat,
};
