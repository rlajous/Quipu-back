const admin = require('firebase-admin');

module.exports = async (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  await admin.auth().verifyIdToken(authHeader)
  .then((decodedToken) => {
    req.userId = decodedToken.uid;
    return next();
  }).catch((error) => {
    error.statusCode = 401;
    return next(error);
  });
};
