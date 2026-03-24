const { createPlaceWalletPass } = require('../services/appleWalletPassService');

const createWalletPass = async (req, res) => {
  try {
    const {
      name,
      address,
      categoryName = null,
      latitude,
      longitude,
      phoneNumber = null,
      appLaunchURL = null,
      planTitle,
      scheduledAt,
      scheduledDateText,
      scheduledTimeText,
      note = null
    } = req.body ?? {};

    if (!name || !address || !planTitle || !scheduledAt || !scheduledDateText || !scheduledTimeText) {
      return res.status(400).json({ error: 'Name, address, plan title, and scheduled visit details are required' });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedScheduledAt = new Date(scheduledAt);

    if (Number.isFinite(parsedLatitude) === false || Number.isFinite(parsedLongitude) === false) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (Number.isNaN(parsedScheduledAt.getTime())) {
      return res.status(400).json({ error: 'Scheduled date is invalid' });
    }

    const pkpassBuffer = await createPlaceWalletPass({
      name: String(name).trim(),
      address: String(address).trim(),
      categoryName: categoryName ? String(categoryName).trim() : null,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
      appLaunchURL: appLaunchURL ? String(appLaunchURL).trim() : null,
      planTitle: String(planTitle).trim(),
      scheduledAt: parsedScheduledAt,
      scheduledDateText: String(scheduledDateText).trim(),
      scheduledTimeText: String(scheduledTimeText).trim(),
      note: note ? String(note).trim() : null,
      userId: req.userId
    });

    const safeName = String(planTitle)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'visit-plan';

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pkpass"`);
    return res.status(200).send(pkpassBuffer);
  } catch (error) {
    if (error.code === 'WALLET_CONFIG_MISSING') {
      return res.status(503).json({ error: error.message });
    }

    console.error('Create Wallet pass error:', error);
    return res.status(500).json({ error: 'Failed to create Wallet pass' });
  }
};

module.exports = { createWalletPass };
