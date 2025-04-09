let isRegistering = false;

function handleLogin() {
    const usernameInput = document.getElementById("usernameInput");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const repeatPasswordInput = document.getElementById("repeatPasswordInput");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const repeatPassword = repeatPasswordInput.value;

    if (!username || !password || (isRegistering && (!email || !repeatPassword))) {
        return alert("Preencha todos os campos.");
    }

    let users = JSON.parse(localStorage.getItem("users") || "[]");

    if (isRegistering) {
        if (users.find(u => u.username === username)) {
            return alert("Usuário já existe.");
        }

        if (password !== repeatPassword) {
            return alert("As senhas não coincidem.");
        }

        users.push({ username, email, password });
        localStorage.setItem("users", JSON.stringify(users));
        alert("Cadastro realizado com sucesso!");
        toggleMode();
    } else {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            localStorage.setItem("loggedInUser", JSON.stringify(user));
            showContent();
            if (user.username === "lino") {
                showAdminPanel();
            }
        } else {
            alert("Usuário ou senha incorretos.");
        }
    }
}

function toggleMode() {
    isRegistering = !isRegistering;

    const modalTitle = document.getElementById("modalTitle");
    const loginButton = document.getElementById("loginButton");
    const emailInput = document.getElementById("emailInput");
    const repeatPasswordWrapper = document.getElementById("repeatPasswordWrapper");
    const toggleText = document.getElementById("toggleText");

    modalTitle.textContent = isRegistering ? "Cadastro" : "Login";
    loginButton.textContent = isRegistering ? "Cadastrar" : "Entrar";
    emailInput.hidden = !isRegistering;
    repeatPasswordWrapper.style.display = isRegistering ? "block" : "none";

    toggleText.innerHTML = isRegistering
        ? 'Já tem conta? <button type="button" onclick="toggleMode()" class="link">Faça login</button>'
        : 'Ainda não tem conta? <button type="button" onclick="toggleMode()" class="link">Cadastre-se aqui</button>';
}

function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.textContent = "🙈";
    } else {
        input.type = "password";
        icon.textContent = "👁️";
    }
}

function logout() {
    localStorage.removeItem("loggedInUser");
    hideContent();
    showLoginModal();
}

// Variáveis globais
const jsonFile = 'jogos.json';
const apiUrl = 'https://flex.smokace718.com/pt-br/game/launch';
let games = [];
let categories = new Map();
let favorites = new Set();

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) {
        showLoginModal();
    } else {
        showContent();
        if (user.username === "lino") {
            showAdminPanel();
        }
    }
    loadGames();
});

async function loadGames() {
    try {
        const response = await fetch(jsonFile);
        if (!response.ok) throw new Error("Erro ao carregar o JSON");
        const data = await response.json();
        games = data.result || [];
        loadFavorites();
        extractCategories(games);
        displayGames(games);
    } catch (error) {
        alert('Erro ao carregar os jogos: ' + error.message);
    }
}

function showLoginModal() {
    document.getElementById("loginModal").style.display = "flex";
    hideContent();
}

function showContent() {
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("gameContainer").style.display = "flex";
    document.querySelector(".filter-container").style.display = "flex";
    document.querySelector(".titulo").style.display = "block";
    document.getElementById("logoutBtn").style.display = "inline-block";
}

function hideContent() {
    document.getElementById("gameContainer").style.display = "none";
    document.querySelector(".filter-container").style.display = "none";
    document.querySelector(".titulo").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
}

function extractCategories(gameList) {
    categories.clear();
    gameList.forEach(game => {
        if (game.categories) {
            game.categories.forEach(cat => categories.set(cat.category_id, cat.name));
        }
    });
    populateCategoryFilter();
}

function populateCategoryFilter() {
    const categorySelect = document.getElementById('categoryFilter');
    categorySelect.innerHTML = '<option value="">Todas as Categorias</option>' +
        Array.from(categories.entries()).map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
}

function displayGames(gameList) {
    const container = document.getElementById('gameContainer');
    container.innerHTML = gameList.map(game => `
        <div class="game-card">
            <img src="${game.images.small}" alt="${game.name}" class="game-image">
            <div class="game-title">${game.name}</div>
            <div class="game-categories">Categorias: ${game.categories.map(cat => cat.name).join(', ')}</div>
            <button onclick="startGame('${game.alias}')">Jogar</button>
            <button onclick="toggleFavorite('${game.alias}')">${isFavorite(game.alias) ? 'Remover Favorito' : 'Favoritar'}</button>
        </div>
    `).join('');
}

function filterGames() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;

    const filteredGames = games.filter(game =>
        game.name.toLowerCase().includes(query) &&
        (selectedCategory === "" || game.categories.some(cat => cat.category_id == selectedCategory))
    );

    displayGames(filteredGames);
}

function displayFavorites() {
    const favoriteGames = games.filter(game => favorites.has(game.alias));
    displayGames(favoriteGames);
}

async function startGame(gameAlias) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ alias: gameAlias, mode: 'demo' })
        });
        if (!response.ok) throw new Error(`Erro: ${response.status}`);
        const data = await response.json();
        if (data.result?.url) {
            const gameUrl = new URL(data.result.url);
            gameUrl.searchParams.set("jurisdiction", "BR");
            gameUrl.searchParams.set("lobbyUrl", "https%3A%2F%2Fgratisbet.vercel.app%2F");
            gameUrl.searchParams.set("lang", "pt");
            gameUrl.searchParams.set("cur", "BRL");

            openModal(gameUrl.toString());
        } else {
            alert('Erro ao iniciar o jogo.');
        }
    } catch (error) {
        alert('Falha ao iniciar o jogo: ' + error.message);
    }
}

function openModal(gameUrl) {
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameFrame');
    modal.style.display = 'block';
    iframe.src = gameUrl;

    document.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        iframe.src = 'https://gratisbet.vercel.app/rupp.html';
    });
}

function toggleFavorite(gameAlias) {
    if (favorites.has(gameAlias)) {
        favorites.delete(gameAlias);
    } else {
        favorites.add(gameAlias);
    }
    saveFavorites();
    displayGames(games);
}

function saveFavorites() {
    localStorage.setItem('favoriteGames', JSON.stringify(Array.from(favorites)));
}

function loadFavorites() {
    const storedFavorites = localStorage.getItem('favoriteGames');
    if (storedFavorites) {
        favorites = new Set(JSON.parse(storedFavorites));
    }
}

function isFavorite(gameAlias) {
    return favorites.has(gameAlias);
}

// ADMIN
function showAdminPanel() {
    const userSection = document.getElementById("userSection");
    const userTableBody = document.querySelector("#userTable tbody");
    const users = JSON.parse(localStorage.getItem("users")) || [];

    userSection.style.display = "block";
    userTableBody.innerHTML = "";

    users.forEach((u, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" value="${u.username}" data-index="${index}" class="edit-username" /></td>
            <td><input type="email" value="${u.email}" data-index="${index}" class="edit-email" /></td>
            <td><input type="text" value="${u.password}" data-index="${index}" class="edit-password" /></td>
            <td class="user-actions">
                <button class="edit-btn" onclick="saveUser(${index})">Salvar</button>
                <button class="delete-btn" onclick="deleteUser(${index})">Excluir</button>
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

function saveUser(index) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const username = document.querySelector(`.edit-username[data-index="${index}"]`).value;
    const email = document.querySelector(`.edit-email[data-index="${index}"]`).value;
    const password = document.querySelector(`.edit-password[data-index="${index}"]`).value;

    users[index].username = username;
    users[index].email = email;
    users[index].password = password;

    localStorage.setItem("users", JSON.stringify(users));
    alert("Usuário atualizado com sucesso!");
}

function deleteUser(index) {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        users.splice(index, 1);
        localStorage.setItem("users", JSON.stringify(users));
        showAdminPanel();
    }
}
