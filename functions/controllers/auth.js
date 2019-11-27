const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  let uid;
  bcrypt
    .hash(password, 12)
    .then(async hashedPw => {
      // eslint-disable-next-line promise/no-nesting
      return await admin.auth().createUser(
      {
        email, 
        password,
        tokens: 100
      }
      ).then(resp => {
        uid = resp.uid;
        return admin.firestore().collection('users').doc(uid).set({
          name: name,
          email,
          password,
          tokens: 100
        });
      });
    })
    .then(result => {
      return res.status(201).json({ message: 'User created!', user: {
        name,
        id: uid,
        email,
        tokens: 100
      }});
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  await admin.auth().createSessionCookie(
    email,
    password
  ).then(() => {
    return res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  }).catch((err) => {
    dispatch({ type: 'LOGIN_ERROR', err });
  });
};

exports.getUser = async (req, res, next) => {
  await admin.firestore().collection('users').doc(req.userId).get()
    .then((doc) => {
        return res.status(200).json(doc.data());
      })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
};

exports.editUser = (req, res, next) => {
  db.collection("cities").doc(req.userId).update(req.data);
};

