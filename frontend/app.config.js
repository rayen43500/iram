const appJson = require('./app.json');

const PHOTO_PERMISSION = 'Permet de choisir une photo pour votre profil.';

const plugins = ['expo-font'];
try {
  require.resolve('expo-image-picker/package.json');
  plugins.push(['expo-image-picker', { photosPermission: PHOTO_PERMISSION }]);
} catch {
  // Dépendance absente : lancez `npm install` ou `npx expo install expo-image-picker` dans ce dossier.
}

const expo = { ...appJson.expo, plugins };

expo.ios = {
  ...expo.ios,
  infoPlist: {
    ...(expo.ios?.infoPlist || {}),
    NSPhotoLibraryUsageDescription:
      expo.ios?.infoPlist?.NSPhotoLibraryUsageDescription || PHOTO_PERMISSION,
  },
};

module.exports = { expo };
