const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const email = req.body.email;
  const password = req.body.password;
  let uid;
  await admin.auth().createUser({
      email, 
      password,
      tokens: 100
    }).then(async resp => {
      uid = resp.uid;
      return;
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
    await admin.firestore().collection('Properties')
    .doc(uid)
    .set({
      sellTransactions: 0,
      buyTransactions: 0,
      buyOrders: 0,
      sellOrders: 0
    });
    await admin.firestore().collection('Users').doc(uid).set({
      email,
      tokens: 100
    }).then(() => {
      return res.status(201).json({ message: 'User created!'});
    })
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
  await admin.firestore().collection('Users').doc(req.userId).get()
    .then((doc) => {
        const data = doc.data();
        data.uid = req.userId;
        return res.status(200).json(data);
      })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
};

exports.editUser = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const uid = req.userId;
  await admin.auth().updateUser(uid, {
    email,
    password
  })
    .then(() => {
      return;
    })
    .catch((error) => {
      console.log('Error updating user:', error);
    });
  await admin.firestore().collection('Users').doc(req.userId)
    .update({ 
      email
    })
    .then(() => {
      return res.status(200).json({ message: 'User Updated!'});
    })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
};

exports.getTransactions = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const transactions = [];
  let pages = 0;
  let buyTransactions = 0;
  let sellTransactions = 0;
  await admin.firestore()
  .collection('Properties')
  .doc(req.userId)
  .get()
  .then((querySnapshot) => {
    const { sellTransactions:rawSellTransactions, buyTransactions:rawBuyTransactions } = querySnapshot.data();
    const totalTransaction = parseInt(rawSellTransactions) + parseInt(rawBuyTransactions);
    buyTransactions = rawBuyTransactions;
    sellTransactions = rawSellTransactions;
    pages = Math.ceil(totalTransaction / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  const limit = Math.ceil(amount / 2);
  let buyLimit = buyTransactions - (page * limit);
  let sellLimit = sellTransactions - (page * limit) ;
  let buyList = buyLimit >= 0;
  let sellList = sellLimit >= 0;
  if (buyLimit < limit) {
    sellLimit += (limit -buyLimit)
  }
  if (sellLimit < limit) {
    buyLimit += (limit - sellLimit)
  }
  if ( buyList ) {
    await admin.firestore().collection('Transactions')
    .where("buyerId", "==", req.userId)
    .orderBy("date")
    .startAt(page * limit)
    .limit(buyLimit)
    .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          transactions.push({...doc.data(), id: doc.id});
        });
        return;
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });
  }
  if ( sellList ) {
    await admin.firestore().collection('Transactions')
    .where("sellerId", "==", req.userId)
    .orderBy("date")
    .startAt(page * limit)
    .limit(sellLimit)
    .get()
    .then((querySnapshot) => {
        return querySnapshot.forEach((doc) => {
          transactions.push({...doc.data(), id: doc.id});
        });
      })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
  }
  res.status(200).json({ pages, transactions });
};

exports.sellTokens = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { tokens, price } = req.body;
  await admin.firestore().collection('SellOrders').add({
      userId: req.userId,
      tokens: parseFloat(tokens),
      price: parseFloat(price),
      date: new Date()
    })
    .then(() => {
      return res.status(200).json({ message: 'Order created!'});
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
};

exports.buyTokens = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { tokens, price } = req.body;
  await admin.firestore().collection('BuyOrders').add({
      userId: req.userId,
      tokens: parseFloat(tokens),
      price: parseFloat(price),
      date: new Date()
    })
    .then(() => {
      return res.status(200).json({ message: 'Order created!'});
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
};

exports.buyers = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const buyers = [];
  let pages = 0;

  await admin.firestore().collection('BuyOrders')
  .orderBy("price")
  .startAt(page * amount)
  .limit(amount)
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      buyers.push({...doc.data(), id: doc.id});
    });
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });

  await admin.firestore()
  .collection('Properties')
  .doc('BuyOrders')
  .get()
  .then((querySnapshot) => {
    pages = Math.ceil(querySnapshot.data().numberOfDocs / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  res.status(200).json({ pages, buyers });
};

exports.sellers = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const sellers = [];
  let pages = 0;

  await admin.firestore().collection('SellOrders')
  .orderBy("price")
  .startAt(page * amount)
  .limit(amount)
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      sellers.push({...doc.data(), id: doc.id});
    });
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  await admin.firestore()
  .collection('Properties')
  .doc('BuyOrders')
  .get()
  .then((querySnapshot) => {
    pages = Math.ceil(querySnapshot.data().numberOfDocs / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  res.status(200).json({ pages, sellers });
};

exports.purchases = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const purchases = [];
  let pages = 0;

  await admin.firestore().collection('BuyOrders')
  .where("userId", "==", req.userId)
  .orderBy("date")
  .startAt(page * amount)
  .limit(amount)
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      purchases.push({...doc.data(), id: doc.id});
    });
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });

  await admin.firestore()
  .collection('Properties')
  .doc(req.userId)
  .get()
  .then((querySnapshot) => {
    const { buyOrders } = querySnapshot.data();
    pages = Math.ceil(buyOrders / amount);
    return;
  });
  res.status(200).json({ pages, purchases });
};

exports.sells = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const sells = [];
  let pages = 0;

  await admin.firestore().collection('SellOrders')
  .where("userId", "==", req.userId)
  .orderBy("date")
  .startAt(page * amount)
  .limit(amount)
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      sells.push({...doc.data(), id: doc.id});
    });
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  await admin.firestore()
  .collection('Properties')
  .doc(req.userId)
  .get()
  .then((querySnapshot) => {
    const { sellOrders } = querySnapshot.data();
    pages = Math.ceil(sellOrders / amount);
    return;
  });
  res.status(200).json({ pages, sells });
};
