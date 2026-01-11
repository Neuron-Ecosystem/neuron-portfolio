// Импорт SDK v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIkhWk34e7LZS7EqfmeK31bahBm8if28c",
  authDomain: "neuron-portfolio-2026.firebaseapp.com",
  projectId: "neuron-portfolio-2026",
  storageBucket: "neuron-portfolio-2026.firebasestorage.app",
  messagingSenderId: "688199450932",
  appId: "1:688199450932:web:f69ffc4bf901d67e392561",
  measurementId: "G-C52KLDJRXP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
