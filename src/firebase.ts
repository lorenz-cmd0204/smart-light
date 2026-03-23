import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
