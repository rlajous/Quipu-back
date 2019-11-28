const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');

FieldValue = require('firebase-admin').firestore.FieldValue;

var serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-api-9a206..firebaseio.com"
});
const authRoutes = require('./routes/auth');

const db = admin.firestore();

app.use(cors({ origin: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/api/auth', authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

exports.BuyOrdersWriteListener = 
  functions.firestore.document('BuyOrders/{documentUid}')
  .onWrite((change, context) => {

  if (!change.before.exists) {
      // New document Created : add one to count

      db.doc('Properties/BuyOrders').update({ numberOfDocs: FieldValue.increment(1) });

  } else if (change.before.exists && change.after.exists) {
      // Updating existing document : Do nothing

  } else if (!change.after.exists) {
      // Deleting document : subtract one from count

      db.doc('Properties/BuyOrders').update({ numberOfDocs: FieldValue.increment(-1) });

  }
});

exports.SellOrdersWriteListener = 
  functions.firestore.document('SellOrders/{documentUid}')
  .onWrite((change, context) => {

  if (!change.before.exists) {
      // New document Created : add one to count

      db.doc('Properties/SellOrders').update({ numberOfDocs: FieldValue.increment(1) });

  } else if (change.before.exists && change.after.exists) {
      // Updating existing document : Do nothing

  } else if (!change.after.exists) {
      // Deleting document : subtract one from count

      db.doc('Properties/SellOrders').update({ numberOfDocs: FieldValue.increment(-1) });

  }


return;
});

exports.app = functions.https.onRequest(app);