const admin = require('firebase-admin');

const db = admin.firestore();

exports.buyOrderTransaction = async change => {
    if (!change.before.exists) {
        let lowestPrice = null;
        const document = change.after.data();
        let seller = null;
        let succes = false;
        await db.collection('SellOrders')
        .where("tokens", "==", parseFloat(document.tokens))
        .where("price", "<=", parseFloat(document.price))
        .orderBy("price")
        .get()
          .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
              if (!lowestPrice && doc.data().userId !== document.userId){
                lowestPrice = doc.id;
                seller = doc;
              }
            });
            return;
          })
            .catch((error) => {
              console.log("Error getting documents: ", error);
            });
        if (lowestPrice) {
            await db.collection('Users').doc(seller.data().userId).get()
            .then((doc) => {
               if (doc.data().tokens >= parseFloat(document.tokens)) {
                succes = true;
               }
               return;
            })
            .catch((error) => {
            console.log("Error getting documents: ", error);
            });
            if (succes){
                await db.collection('Transactions').add({
                    sellerId:  seller.data().userId,
                    tokens: parseFloat(document.tokens),
                    price: parseFloat(seller.data().price),
                    buyerId: document.userId,
                    date: new Date()
                  }).then(async () => {
                    await db.collection("Users").doc(document.userId).update({ tokens: FieldValue.increment(parseFloat(document.tokens)) });
                    await db.collection("Users").doc(seller.data().userId).update({ tokens: FieldValue.increment(-parseFloat(document.tokens)) });
                    await db.collection("BuyOrders").doc(change.after.id).delete();
                    await db.collection("SellOrders").doc(lowestPrice).delete()
                    return;
                  })
                  .catch((error) => {
                    console.log("Error getting documents: ", error);
                  });
            }

        }
    }
}

exports.sellOrderTransaction = async change => {
    if (!change.before.exists) {
        let lowestPrice = null;
        const document = change.after.data();
        let buyer = null;
        let succes = false;
        await db.collection('BuyOrders')
        .where("tokens", "==", parseFloat(document.tokens))
        .where("price", ">=", parseFloat(document.price))
        .orderBy("price",'desc')
        .get()
          .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
              if (!lowestPrice && doc.data().userId !== document.userId){
                lowestPrice = doc.id;
                buyer = doc;
              }
            });
            return;
          })
            .catch((error) => {
              console.log("Error getting documents: ", error);
          });
        if (lowestPrice) {
            await db.collection('Users').doc(document.userId).get()
            .then((doc) => {
               if (doc.data().tokens >= parseFloat(document.tokens)) {
                succes = true;
               }
               return;
            })
            .catch((error) => {
            console.log("Error getting documents: ", error);
            });
            if (succes) {
                await db.collection('Transactions').add({
                    sellerId: document.userId,
                    tokens: parseFloat(document.tokens),
                    price: parseFloat(buyer.data().price),
                    buyerId: buyer.data().userId,
                    date: new Date()
                }).then(async () => {
                    await db.collection("Users").doc(buyer.data().userId).update({ tokens: FieldValue.increment(parseFloat(document.tokens)) });
                    await db.collection("Users").doc(document.userId).update({ tokens: FieldValue.increment(-parseFloat(document.tokens)) });
                    await db.collection("SellOrders").doc(change.after.id).delete();
                    await db.collection("BuyOrders").doc(lowestPrice).delete();
                    return;
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });
            }
        }
    }
}