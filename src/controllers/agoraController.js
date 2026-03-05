const { RtcTokenBuilder, RtcRole } = require('agora-token');

const generateToken = async (req, res) => {
  try {
    const { channelName, uid } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({ error: 'Agora credentials not configured' });
    }

    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    const uidNumber = uid || 0;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uidNumber,
      RtcRole.PUBLISHER,
      expirationTimeInSeconds,
      privilegeExpiredTs
    );

    res.json({ token, channelName, uid: uidNumber, appId });

  } catch (error) {
    console.error('Agora token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

module.exports = { generateToken };