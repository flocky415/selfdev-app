// SelfDev — конфіг Firebase (Project settings → Web app).
// © 2026 Roman Chelyk. Усі права захищено.
//
// Web-ключ Firebase за задумом публічний: він лише вказує, до якого проєкту звертатись,
// і секретом не є. Безпеку дають НЕ приховані ключі, а:
//  1) правила Firestore — встав вміст файлу firestore.rules у Firebase Console → Firestore → Rules;
//  2) обмеження ключа за HTTP-referrer у Google Cloud Console → APIs & Services → Credentials;
//  3) (бажано) Firebase App Check;
//  4) у Authentication → Settings → Authorized domains залиш лише свій домен.
// Поки тут заглушка "YOUR_API_KEY", змагання з друзями працювати не буде.

const firebaseConfig = {
  apiKey: "AIzaSyDaSMZjCxrlQDKIJF-R5fJVktXhpn6xsNc",
  authDomain: "selfdev-47e40.firebaseapp.com",
  projectId: "selfdev-47e40",
  storageBucket: "selfdev-47e40.firebasestorage.app",
  messagingSenderId: "55640086862",
  appId: "1:55640086862:web:591030e8c8cddc7deea61f"
};
