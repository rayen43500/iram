const appJson = require('./app.json');

const PHOTO_PERMISSION = 'Permet de choisir une photo pour votre profil et vos documents.';

function tryPlugin(name, options) {
  try {
    require.resolve(`${name}/package.json`);
    return options ? [name, options] : name;
  } catch {
    return null;
  }
}

const plugins = ['expo-font'];
const imagePicker = tryPlugin('expo-image-picker', { photosPermission: PHOTO_PERMISSION });
const notifications = tryPlugin('expo-notifications');
const localAuth = tryPlugin('expo-local-authentication');
const secureStore = tryPlugin('expo-secure-store');
if (imagePicker) plugins.push(imagePicker);
if (notifications) plugins.push(notifications);
if (localAuth) plugins.push(localAuth);
if (secureStore) plugins.push(secureStore);

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...(appJson.expo.ios?.infoPlist || {}),
        NSPhotoLibraryUsageDescription: PHOTO_PERMISSION,
        NSFaceIDUsageDescription: 'Connexion sécurisée à votre espace bancaire.',
      },
    },
    android: {
      ...appJson.expo.android,
      permissions: [
        ...(appJson.expo.android?.permissions || []),
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
      ],
    },
  },
};
