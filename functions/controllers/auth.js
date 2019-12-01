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
      ).then(async resp => {
        uid = resp.uid;
        await admin.firestore().collection('Properties')
          .doc(uid)
          .set({
            sellTransactions: 0,
            buyTransactions: 0
          });
        return admin.firestore().collection('Users').doc(uid).set({
          email,
          tokens: 100
        });
      });
    })
    .then(() => {
      return res.status(201).json({ message: 'User created!'});
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
  await admin.firestore().collection('Users').doc(req.userId)
    .update({ 
      email
    })
    .then((doc) => {
      const data = doc.data();
      data.uid = req.userId;
      return res.status(200).json({ data, message: 'User Updated!'});
    })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
};

exports.getTransactions = async (req, res, next) => {
  const { page:rawPage, amount:rawAmount } = req.query;
  const page = parseInt(rawPage);
  const amount = parseInt(rawAmount);
  const transactions = [];
  let pages = 0;
  let buyTransactions = 0;
  let sellTransactions = 0;
  console.log({ page , amount})
  await admin.firestore()
  .collection('Properties')
  .doc(req.userId)
  .get()
  .then((querySnapshot) => {
    const { sellTransactions:rawSellTransactions, buyTransactions:rawBuyTransactions } = querySnapshot.data();
    const totalTransaction = parseInt(rawSellTransactions) + parseInt(rawBuyTransactions);
    buyTransactions = rawBuyTransactions;
    sellTransactions = rawSellTransactions;
    pages = Math.trunc(totalTransaction / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  const limit = Math.trunc(amount / 2);
  let buyLimit = buyTransactions - (page * limit);
  let sellLimit = sellTransactions - (page * limit) ;
  let buyList = buyLimit > 0;
  let sellList = sellLimit > 0;
  if (buyLimit < limit) {
    sellLimit += (buyLimit - limit)
  }
  if (sellLimit < limit) {
    buyLimit += (sellLimit - limit)
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
          transactions.push(doc.data());
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
          transactions.push(doc.data());
        });
      })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
  }

  res.status(200).json({ pages, transactions });
};

exports.sellTokens = async (req, res, next) => {
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
  const { tokens, price } = req.body;
  console.log({ tokens, price });
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
      buyers.push(doc.data());
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
    pages = Math.trunc(querySnapshot.data().numberOfDocs / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  res.status(200).json({ pages, buyers });
};

exports.sellers = async (req, res, next) => {
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
      sellers.push(doc.data());
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
    pages = Math.trunc(querySnapshot.data().numberOfDocs / amount);
    return;
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });
  res.status(200).json({ pages, sellers });
};