const express = require('express');
const { body } = require('express-validator/check');
const admin = require('firebase-admin');

const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

const db = admin.firestore();

router.put(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email.')
      .custom((value, { req }) => {
        return db.collection('users').where("email", "==", value).get()
        .then((querySnapshot) => !querySnapshot.size)
        .catch((error) => {
          console.log("Error getting documents: ", error);
        });
      })
      .withMessage('The email address is already in use by another account.')
      .normalizeEmail(),
    body('password')
      .trim()
      .isLength({ min: 5 }),
    body('name')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.signup
);

router.post('/login', authController.login);

router.get('/user', isAuth, authController.getUser);

router.get('/transactions', isAuth, authController.getTransactions);

router.post('/editUser', isAuth, authController.editUser);

router.post('/sellTokens', isAuth, authController.sellTokens);

router.post('/buyTokens', isAuth, authController.buyTokens);

router.get('/sellers', isAuth, authController.sellers);

router.get('/buyers', isAuth, authController.buyers);

module.exports = router;
