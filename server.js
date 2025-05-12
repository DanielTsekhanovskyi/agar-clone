const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));  // Статичні файли для клієнта

const players = new Map(); // Зберігаємо всіх гравців
const mapWidth = 3000;
const mapHeight = 3000;

// Додаємо CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Додаємо логування для всіх підключень
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Обробка підключень
io.on('connection', (socket) => {
    console.log('Новий гравець підключився:', socket.id);
    console.log('Загальна кількість гравців:', players.size + 1);

    socket.on('startGame', (playerData) => {
        console.log('Гравець почав гру:', socket.id, playerData);
        // Створюємо нового гравця
        const player = {
            id: socket.id,
            x: Math.random() * mapWidth,
            y: Math.random() * mapHeight,
            radius: 20,
            color: playerData.color,
            nickname: playerData.nickname,
            score: 0
        };
        
        players.set(socket.id, player);
        console.log('Поточні гравці:', Array.from(players.values()));
        
        // Відправляємо початкові дані гравцю
        socket.emit('gameState', {
            players: Array.from(players.values()),
            mapWidth,
            mapHeight
        });
        
        // Повідомляємо всіх про нового гравця
        socket.broadcast.emit('playerJoined', player);
    });

    socket.on('playerMove', (position) => {
        const player = players.get(socket.id);
        if (player) {
            player.x = position.x;
            player.y = position.y;
            player.radius = position.radius;
            player.score = position.score;
            
            // Відправляємо оновлення всім іншим гравцям
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: player.x,
                y: player.y,
                radius: player.radius,
                score: player.score
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Гравець відключився:', socket.id);
        players.delete(socket.id);
        console.log('Залишилось гравців:', players.size);
        io.emit('playerLeft', socket.id);
    });
});

// Стартуємо сервер
http.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
    console.log('WebSocket сервер налаштований');
});
