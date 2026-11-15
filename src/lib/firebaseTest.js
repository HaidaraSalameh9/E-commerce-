import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function testFirebaseConnection() {
	const snapshot = await getDocs(collection(db, 'connectionTest'));

	console.log('Firebase connected successfully!');
	console.log('Documents found:', snapshot.size);
}
