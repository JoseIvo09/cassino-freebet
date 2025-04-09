// app.js

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvDHmSCgDLnGVk5-8wF5gy3VE7ZlojcKY",
  authDomain: "freebet-9b925.firebaseapp.com",
  projectId: "freebet-9b925",
  storageBucket: "freebet-9b925.appspot.com",
  messagingSenderId: "626232438021",
  appId: "1:626232438021:web:aba78987dd6ecce213db6c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isRegistering = false;
let favorites = new Set();

window.toggleMode = function () {
  isRegistering = !isRegistering;
  document.getElementById("modalTitle").textContent = isRegistering ? "Cadastro" : "Login";
  document.getElementById("emailInput").hidden = !isRegistering;
  document.getElementById("repeatPasswordWrapper").style.display = isRegistering ? "block" : "none";
  document.getElementById("loginButton").textContent = isRegistering ? "Cadastrar" : "Entrar";
  document.getElementById("toggleText").innerHTML = isRegistering ?
    'Já tem uma conta? <button type="button" onclick="toggleMode()" class="link">Entrar</button>' :
    'Ainda não tem conta? <button type="button" onclick="toggleMode()" class="link">Cadastre-se aqui</button>';
};

window.handleLogin = async function () {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const repeatPassword = repeatPasswordInput.value;

  if (!username || !password || (isRegistering && (!email || !repeatPassword))) {
    return alert("Preencha todos os campos.");
  }

  try {
    if (isRegistering) {
      if (password !== repeatPassword) return alert("Senhas não coincidem.");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), { username, email });
      alert("Cadastro realizado com sucesso!");
      toggleMode();
    } else {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
      if (userDoc.exists()) {
        showContent();
        if (userDoc.data().username === "lino") showAdminPanel();
      }
    }
  } catch (error) {
    alert("Erro: " + error.message);
  }
};

window.logout = function () {
  signOut(auth).then(() => {
    hideContent();
    showLoginModal();
  });
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadFavorites();
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      showContent();
      if (userDoc.data().username === "lino") showAdminPanel();
    }
  } else {
    showLoginModal();
  }
});

window.showAdminPanel = async function () {
  const userSection = document.getElementById("userSection");
  const userTableBody = document.querySelector("#userTable tbody");
  const querySnapshot = await getDocs(collection(db, "users"));

  userSection.style.display = "block";
  userTableBody.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const u = docSnap.data();
    const uid = docSnap.id;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${u.username}" data-uid="${uid}" class="edit-username" /></td>
      <td><input type="email" value="${u.email}" data-uid="${uid}" class="edit-email" /></td>
      <td class="user-actions">
        <button onclick="saveUser('${uid}')">Salvar</button>
        <button onclick="deleteUser('${uid}')">Excluir</button>
      </td>`;
    userTableBody.appendChild(row);
  });
};

window.saveUser = async function (uid) {
  const username = document.querySelector(`.edit-username[data-uid="${uid}"]`).value;
  const email = document.querySelector(`.edit-email[data-uid="${uid}"]`).value;
  await updateDoc(doc(db, "users", uid), { username, email });
  alert("Usuário atualizado.");
};

window.deleteUser = async function (uid) {
  if (confirm("Excluir usuário?")) {
    await deleteDoc(doc(db, "users", uid));
    showAdminPanel();
  }
};

async function loadFavorites() {
  const user = auth.currentUser;
  if (!user) return;
  const favDoc = await getDoc(doc(db, "favorites", user.uid));
  if (favDoc.exists()) {
    favorites = new Set(favDoc.data().list || []);
  }
}

async function saveFavorites() {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "favorites", user.uid), { list: Array.from(favorites) });
}

window.toggleFavorite = function (alias) {
  if (favorites.has(alias)) {
    favorites.delete(alias);
  } else {
    favorites.add(alias);
  }
  saveFavorites();
  displayGames(games);
};

window.isFavorite = function (alias) {
  return favorites.has(alias);
};
