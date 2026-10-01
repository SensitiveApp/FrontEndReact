// Complète app.json avec la clé Google Maps Android, lue depuis l'environnement
// pour ne pas la committer dans le dépôt public :
// - builds EAS : variable d'environnement EAS GOOGLE_MAPS_ANDROID_API_KEY
// - en local : fichier .env.local (ignoré par git)
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  // Sur les serveurs EAS, une build sans clé donnerait une carte vide : on échoue tout de suite
  if (!apiKey && process.env.EAS_BUILD) {
    throw new Error('GOOGLE_MAPS_ANDROID_API_KEY manquante : ajoutez-la avec `eas env:create`.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey } },
    },
  };
};
