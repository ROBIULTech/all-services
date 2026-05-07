import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

async function checkOrderDetails() {
  try {
    const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId);

    const orderId = 'QJipwQB0keB8NgVLvrE2';
    const orderDoc = await getDoc(doc(db, 'orders', orderId));

    if (orderDoc.exists()) {
      console.log('Order Data:', JSON.stringify(orderDoc.data(), null, 2));
    } else {
      console.log('Order not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkOrderDetails();
