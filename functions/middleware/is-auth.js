const admin = require('firebase-admin');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  admin.auth().verifyIdToken(token)
  .then((decodedToken) => {
    req.userId = decodedToken.uid;
    return next();
  }).catch((error) => {
    error.statusCode = 401;
    throw error;
  });
  next();
};
