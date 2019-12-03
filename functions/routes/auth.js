const express = require('express');
const { body, query } = require('express-validator/check');
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
      .isLength({ min: 8 })
  ],
  authController.signup
);

router.post('/login',  [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 8 })
], authController.login);

router.get('/user', isAuth, authController.getUser);

router.get('/transactions', [
  query('page')
    .isInt()
    .withMessage('Please enter a valid page number.'),
  query('amount')
    .isInt()
    .withMessage('Please enter a valid amount number.')
],isAuth, authController.getTransactions);

router.post('/editUser', [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 8 })
], isAuth, authController.editUser);

router.post('/sellTokens', [
  body('tokens')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Please enter a valid token number.'),
  body('price')
    .toFloat()
    .isFloat({ min: 0.01 })
    .withMessage('Please enter a valid price number.')
], isAuth, authController.sellTokens);

router.post('/buyTokens', [
  body('tokens')
    .isInt({ min: 1 })
    .withMessage('Please enter a valid token number.'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Please enter a valid price number.')
], isAuth, authController.buyTokens);

router.get('/sellers', [
  query('page')
    .isInt()
    .withMessage('Please enter a valid page number.'),
  query('amount')
    .isInt()
    .withMessage('Please enter a valid amount number.')
], isAuth, authController.sellers);

router.get('/buyers', [
  query('page')
    .isInt()
    .withMessage('Please enter a valid page number.'),
  query('amount')
    .isInt()
    .withMessage('Please enter a valid amount number.')
], isAuth, authController.buyers);

router.get('/purchases', [
  query('page')
    .isInt()
    .withMessage('Please enter a valid page number.'),
  query('amount')
    .isInt()
    .withMessage('Please enter a valid amount number.')
], isAuth, authController.purchases);

router.get('/sells', [
  query('page')
    .isInt()
    .withMessage('Please enter a valid page number.'),
  query('amount')
    .isInt()
    .withMessage('Please enter a valid amount number.')
], isAuth, authController.sells);

module.exports = router;
