const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PKPass } = require('passkit-generator');

const PASS_MODEL_PATH = path.join(__dirname, '..', 'wallet', 'NexaPlace.pass');

function readCertificateValue(base64Key, pathKey) {
  const base64Value = process.env[base64Key];
  if (base64Value) {
    return Buffer.from(base64Value, 'base64');
  }

  const filePath = process.env[pathKey];
  if (filePath) {
    return fs.readFileSync(filePath);
  }

  return null;
}

function createConfigurationError(message) {
  const error = new Error(message);
  error.code = 'WALLET_CONFIG_MISSING';
  return error;
}

function loadCertificates() {
  const wwdr = readCertificateValue(
    'APPLE_WALLET_WWDR_BASE64',
    'APPLE_WALLET_WWDR_PATH'
  );
  const signerCert = readCertificateValue(
    'APPLE_WALLET_SIGNER_CERT_BASE64',
    'APPLE_WALLET_SIGNER_CERT_PATH'
  );
  const signerKey = readCertificateValue(
    'APPLE_WALLET_SIGNER_KEY_BASE64',
    'APPLE_WALLET_SIGNER_KEY_PATH'
  );
  const signerKeyPassphrase = process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE;

  if (!wwdr || !signerCert || !signerKey) {
    throw createConfigurationError(
      'Apple Wallet certificates are not configured. Add WWDR, signer cert, and signer key env values.'
    );
  }

  return {
    wwdr,
    signerCert,
    signerKey,
    signerKeyPassphrase
  };
}

function requiredEnvironmentValue(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw createConfigurationError(`Missing required Apple Wallet configuration: ${key}`);
  }
  return value;
}

function buildMapsURL(place) {
  const query = encodeURIComponent(`${place.name} ${place.address}`.trim());
  return `https://maps.apple.com/?q=${query}&ll=${place.latitude},${place.longitude}`;
}

function normalizeCategoryName(categoryName) {
  if (!categoryName) {
    return null;
  }

  const trimmed = String(categoryName).trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^mkpoicategory/i, '');
  const spaced = withoutPrefix
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  if (!spaced) {
    return null;
  }

  return spaced
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function compactFields(fields) {
  return fields.filter((field) => field.value !== null && field.value !== undefined && String(field.value).trim() !== '');
}

async function createPlaceWalletPass(place) {
  const passTypeIdentifier = requiredEnvironmentValue('APPLE_WALLET_PASS_TYPE_IDENTIFIER');
  const teamIdentifier = requiredEnvironmentValue('APPLE_WALLET_TEAM_IDENTIFIER');
  const organizationName = requiredEnvironmentValue('APPLE_WALLET_ORGANIZATION_NAME');
  const certificates = loadCertificates();

  const serialNumber = crypto
    .createHash('sha1')
    .update(`${place.userId}:${place.name}:${place.address}:${place.latitude}:${place.longitude}`)
    .digest('hex');
  const categoryName = normalizeCategoryName(place.categoryName);

  const pass = await PKPass.from(
    {
      model: PASS_MODEL_PATH,
      certificates
    },
    {
      serialNumber,
      description: 'Saved place',
      organizationName,
      passTypeIdentifier,
      teamIdentifier,
      logoText: 'Nexa Places',
      foregroundColor: 'rgb(22, 22, 28)',
      labelColor: 'rgb(110, 110, 120)',
      backgroundColor: 'rgb(245, 245, 247)',
      associatedStoreIdentifiers: [],
      locations: [
        {
          latitude: place.latitude,
          longitude: place.longitude,
          relevantText: `You saved ${place.name} in Nexa Places.`
        }
      ]
    }
  );

  pass.headerFields.push(
    ...compactFields([
      {
        key: 'category',
        label: 'CATEGORY',
        value: categoryName
      }
    ])
  );

  pass.primaryFields.push({
    key: 'place-name',
    label: 'PLACE',
    value: place.name
  });

  pass.secondaryFields.push(
    ...compactFields([
      {
        key: 'address',
        label: 'ADDRESS',
        value: place.address
      }
    ])
  );

  pass.auxiliaryFields.push(
    ...compactFields([
      {
        key: 'phone',
        label: 'PHONE',
        value: place.phoneNumber
      }
    ])
  );

  pass.backFields.push(
    ...compactFields([
      {
        key: 'maps',
        label: 'OPEN IN MAPS',
        value: buildMapsURL(place)
      },
      {
        key: 'deep-link',
        label: 'OPEN IN NEXADEMO',
        value: place.appLaunchURL
      },
      {
        key: 'coordinates',
        label: 'COORDINATES',
        value: `${place.latitude}, ${place.longitude}`
      }
    ])
  );

  pass.setBarcodes(place.appLaunchURL || buildMapsURL(place));

  return pass.getAsBuffer();
}

module.exports = { createPlaceWalletPass };
