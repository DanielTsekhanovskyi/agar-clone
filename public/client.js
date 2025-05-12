const socket = io('https://agar-clone-safv.onrender.com', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    withCredentials: true
});

socket.on('connect', () => {
    console.log('Підключено до сервера');
});

socket.on('connect_error', (error) => {
    console.error('Помилка підключення до сервера:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Відключено від сервера:', reason);
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('startMenu');
const startButton = document.getElementById('startButton');
const nicknameInput = document.getElementById('nicknameInput');
const winMenu = document.getElementById('winMenu');
const restartButton = document.getElementById('restartButton');

// Додаємо обробник події для кнопки старту
startButton.addEventListener('click', startGame);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const mapWidth = 3000;
const mapHeight = 3000;
const winScore = 100;

let player;
let target;
let bots = [];
let otherPlayers = new Map();
let gameStarted = false;
let gameWon = false;
let score = 0;

function randomColor() {
    const colors = ['green', 'red', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime', 'magenta'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function spawnBot() {
    bots.push({
        x: Math.random() * mapWidth,
        y: Math.random() * mapHeight,
        radius: 10 + Math.random() * 10,
        color: randomColor()
    });
}

function showStartMenu() {
    startMenu.style.display = 'flex';
    canvas.style.display = 'none';
    winMenu.style.display = 'none';
}

function startGame() {
    if (nicknameInput.value.trim() === '') {
        alert('Будь ласка, введіть ваш нікнейм!');
        return;
    }

    gameStarted = true;
    gameWon = false;
    score = 0;
    startMenu.style.display = 'none';
    canvas.style.display = 'block';
    winMenu.style.display = 'none';

    player = {
        x: mapWidth / 2,
        y: mapHeight / 2,
        radius: 20,
        color: randomColor(),
        nickname: nicknameInput.value
    };

    target = { x: player.x, y: player.y };
    bots = [];
    otherPlayers.clear();

    for (let i = 0; i < 30; i++) {
        spawnBot();
    }

    // Відправляємо дані про початок гри на сервер
    socket.emit('startGame', {
        nickname: player.nickname,
        color: player.color
    });

    gameLoop();
}

// Обробка подій від сервера
socket.on('gameState', (data) => {
    console.log('Отримано стан гри:', data);
    data.players.forEach(p => {
        if (p.id !== socket.id) {
            otherPlayers.set(p.id, p);
        }
    });
});

socket.on('playerJoined', (newPlayer) => {
    console.log('Новий гравець приєднався:', newPlayer);
    otherPlayers.set(newPlayer.id, newPlayer);
});

socket.on('playerLeft', (playerId) => {
    console.log('Гравець покинув гру:', playerId);
    otherPlayers.delete(playerId);
});

socket.on('playerMoved', (playerData) => {
    console.log('Гравець рухається:', playerData);
    if (otherPlayers.has(playerData.id)) {
        otherPlayers.set(playerData.id, {
            ...otherPlayers.get(playerData.id),
            ...playerData
        });
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (!gameStarted) return;
    target.x = player.x - canvas.width / 2 + event.clientX;
    target.y = player.y - canvas.height / 2 + event.clientY;
});

function gameLoop() {
    if (!gameStarted) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(distance / 10, 5);

    player.x += (dx / distance) * speed || 0;
    player.y += (dy / distance) * speed || 0;

    player.x = Math.max(player.radius, Math.min(mapWidth - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(mapHeight - player.radius, player.y));

    // Відправляємо оновлення позиції на сервер
    socket.emit('playerMove', {
        x: player.x,
        y: player.y,
        radius: player.radius,
        score: score
    });

    drawBackground();
    drawBots();
    drawOtherPlayers();
    drawPlayer();
    checkCollisions();
    checkWin();

    if (bots.length < 30) {
        spawnBot();
    }

    requestAnimationFrame(gameLoop);
}

function drawOtherPlayers() {
    otherPlayers.forEach(otherPlayer => {
        ctx.beginPath();
        ctx.arc(
            otherPlayer.x - player.x + canvas.width / 2,
            otherPlayer.y - player.y + canvas.height / 2,
            otherPlayer.radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = otherPlayer.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fill();

        // Малюємо нікнейм іншого гравця
        ctx.fillStyle = 'black';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            otherPlayer.nickname,
            otherPlayer.x - player.x + canvas.width / 2,
            otherPlayer.y - player.y + canvas.height / 2 + otherPlayer.radius + 20
        );
    });
}

function drawBackground() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 100;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    // Малюємо сітку
    for (let x = -player.x + canvas.width / 2 % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = -player.y + canvas.height / 2 % gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Малюємо межі карти жирною чорною лінією
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5; // Задаємо товщину лінії

    // Лінії для межі карти
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(mapWidth, 0); // верхня межа
    ctx.lineTo(mapWidth, mapHeight); // права межа
    ctx.lineTo(0, mapHeight); // нижня межа
    ctx.lineTo(0, 0); // ліва межа
    ctx.stroke();
}

function drawPlayer() {
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.nickname, canvas.width / 2, canvas.height / 2 + player.radius + 20);

    ctx.fillStyle = 'black';
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText('Score: ' + score, 20, 30);
}

function drawBots() {
    for (let bot of bots) {
        ctx.beginPath();
        ctx.arc(
            bot.x - player.x + canvas.width / 2,
            bot.y - player.y + canvas.height / 2,
            bot.radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = bot.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fill();
    }
}

function checkCollisions() {
    // Перевірка зіткнень з ботами
    for (let i = bots.length - 1; i >= 0; i--) {
        const bot = bots[i];
        const dx = player.x - bot.x;
        const dy = player.y - bot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + bot.radius) {
            bots.splice(i, 1);
            player.radius += 2;
            score += 10;
        }
    }

    // Перевірка зіткнень з іншими гравцями
    otherPlayers.forEach((otherPlayer, id) => {
        const dx = player.x - otherPlayer.x;
        const dy = player.y - otherPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Якщо наш гравець більший за іншого гравця
        if (player.radius > otherPlayer.radius && distance < player.radius) {
            player.radius += otherPlayer.radius / 2;
            score += Math.floor(otherPlayer.radius * 2);
            otherPlayers.delete(id);
        }
        // Якщо інший гравець більший за нашого
        else if (otherPlayer.radius > player.radius && distance < otherPlayer.radius) {
            gameStarted = false;
            showStartMenu();
            alert("Вас з'їли! Спробуйте ще раз!");
        }
    });
}

function checkWin() {
    if (score >= winScore && !gameWon) {
        gameWon = true;
        gameStarted = false;
        showWinMenu();
    }
}

function showWinMenu() {
    winMenu.style.display = 'flex';
    canvas.style.display = 'none';
}

restartButton.addEventListener('click', () => {
    startGame();
});

// Початок гри
showStartMenu();