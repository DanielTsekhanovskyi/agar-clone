const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));  // Статичні файли для клієнта

const players = new Map(); // Зберігаємо всіх гравців
const mapWidth = 3000;
const mapHeight = 3000;

// Обробка підключень
io.on('connection', (socket) => {
    console.log('Новий гравець підключився:', socket.id);

    socket.on('startGame', (playerData) => {
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
        io.emit('playerLeft', socket.id);
    });
});

// Стартуємо сервер
http.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});
