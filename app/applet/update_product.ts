import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function update() {
  const docRef = doc(db, 'products', '19');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('Old options:', data.options);
    
    // Filter out the old options
    const newOptions = [
      { name: 'পিডিএফ (বাংলা)', price: 150 },
      { name: 'পিডিএফ (English)', price: 150 },
      { name: 'ওয়াড ফাইল (বাংলা)', price: 150 },
      { name: 'ওয়াড ফাইল (English)', price: 150 }
    ];
    
    await updateDoc(docRef, { options: newOptions });
    console.log('Updated options to:', newOptions);
  } else {
    console.log('No such document!');
  }
  process.exit(0);
}
update();
