import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAOIS45vtlAB-f0bxab_y8rCsGX_f7kTFE",
  authDomain: "barbearia-ivo.firebaseapp.com",
  databaseURL: "https://barbearia-ivo-default-rtdb.firebaseio.com/",
  projectId: "barbearia-ivo",
  storageBucket: "barbearia-ivo.firebasestorage.app",
  messagingSenderId: "173532886447",
  appId: "1:173532886447:web:f922a76493ba461deeab5a",
  measurementId: "G-T0XD7NBCBL"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);