const firebaseConfig = { 
  apiKey : "AIzaSyBLZFM_9BDLaFw2eX59xC3Ez_Vqhwx5XSw" , 
  authDomain : "eys-app-bb8a2.firebaseapp.com" , 
  projectId : "eys-app-bb8a2" , 
  storageBucket : "eys-app-bb8a2.firebasestorage.app" , 
  messagingSenderId : "10067600761" , 
  appId : "1:10067600761:web:5ba940f7170258c45cfba8" 
};
// 1. Inicializa Firebase con tus llaves
firebase.initializeApp(firebaseConfig);

// 2. Crea la variable global 'db' para que logica.js la pueda usar
window.db = firebase.firestore();