const isProd = () => process.env.NODE_ENV === 'production';

exports.notFound = (req, res, next) => {
  res.status(404);
  next(new Error('Route introuvable'));
};

exports.errorHandler = (err, req, res, next) => {
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Identifiant invalide';
  } else if (err.code === 11000) {
    status = 400;
    message = 'Cette valeur existe déjà (email ou nom déjà utilisé)';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde (3 Mo maximum)' : 'Envoi de fichier invalide';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Requête invalide (JSON mal formé)';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Requête trop volumineuse';
  }

  if (status >= 500) {
    console.error(err); // le détail reste dans les journaux du serveur…
    if (isProd()) message = 'Une erreur est survenue. Réessayez plus tard.'; // …et n'est jamais montré au visiteur
  }
  res.status(status).json({ message });
};
