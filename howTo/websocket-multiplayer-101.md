# WebSocket Multiplayer Game System - Complete Guide

## 1. Sistem Mimarisi

### Önerilen Backend Yapısı
```
backend/
├── api.js (mevcut REST API)
├── websocket/
│   ├── socketServer.js     # WebSocket server
│   ├── gameManager.js      # Oyun odaları yönetimi
│   ├── roomManager.js      # Room mantığı
│   └── gameLogic.js        # Oyun kuralları
└── merkleManager.js (mevcut)
```

### WebSocket Server Konumu
- **Backend içerisinde** olmalı, ayrı servis gerekli değil
- Mevcut Express.js server ile aynı port'ta Socket.IO kullanın
- `api.js` dosyasına Socket.IO entegrasyonu yapın

## 2. Room Sistemi (Zorunlu)

10'larca kullanıcı için mutlaka room sistemi gerekli:

```javascript
// Room Structure Örneği
{
  roomId: "room_123",
  players: [
    { socketId: "abc", address: "0x123...", ready: false, dice: null },
    { socketId: "def", address: "0x456...", ready: false, dice: null }
  ],
  gameState: "waiting", // waiting, rolling, finished
  betAmount: 0.001,
  winner: null,
  createdAt: new Date()
}
```

## 3. Game Logic Konumu

**Kesinlikle Backend'de!** Güvenlik açısından kritik:

- Zar sonuçları backend'de üretilmeli
- Kazanan/kaybeden kararı backend'de verilmeli  
- Frontend sadece UI güncellemesi yapmalı
- Blockchain işlemleri (deposit/withdraw) backend'de yönetilmeli

## 4. Önerilen Game Flow

```
1. Player A joins room → WebSocket emit: "join-room"
2. Player B joins room → Room full, game can start
3. Both players ready → WebSocket emit: "player-ready"
4. Backend starts dice rolling → WebSocket broadcast: "game-start"
5. Backend generates dice results → WebSocket broadcast: "dice-results"
6. Backend determines winner → WebSocket broadcast: "game-end"
7. Backend processes blockchain transactions
```

## 5. Redis vs Memory Performans Analizi

### Redis Hızı
- **In-memory database** → RAM'de çalışır
- **Ortalama response time**: 0.1-1ms 
- **Network latency**: 1-5ms (local network)
- **Toplam ek süre**: ~2-6ms

### Ne Zaman Hangisi?

#### Development/Test → Memory Yeterli
```javascript
class GameManager {
  constructor() {
    this.rooms = new Map(); // Memory'de tut
  }
  
  createRoom(roomId) {
    this.rooms.set(roomId, {
      players: [],
      gameState: "waiting"
    });
  }
}
```

#### Production → Hibrit Sistem (En Optimal)
```javascript
class GameManager {
  constructor() {
    this.activeRooms = new Map(); // Hot data - memory'de
    this.redis = new Redis();     // Cold data - Redis'te
  }
  
  async getRoomData(roomId) {
    // Önce memory'de ara (0ms)
    if (this.activeRooms.has(roomId)) {
      return this.activeRooms.get(roomId);
    }
    
    // Bulamazsa Redis'ten al (~2-6ms)
    const roomData = await this.redis.get(`room:${roomId}`);
    if (roomData) {
      // Memory'e cache'le
      this.activeRooms.set(roomId, JSON.parse(roomData));
      return JSON.parse(roomData);
    }
    
    return null;
  }
  
  updateRoomData(roomId, data) {
    // Memory'i güncelle (0ms)
    this.activeRooms.set(roomId, data);
    
    // Redis'e async yaz (non-blocking)
    this.redis.set(`room:${roomId}`, JSON.stringify(data));
  }
}
```

## 6. Room Oluşturma ve Management

### Frontend → Backend Flow
```javascript
// pickANumber.jsx
const startGame = () => {
  socket.emit('join-room', {
    userAddress: userAddress,
    betAmount: amount
  });
};
```

### Backend Room Handler
```javascript
// socketServer.js
socket.on('join-room', async (data) => {
  const { userAddress, betAmount } = data;
  
  // 1. Kullanıcı zaten bir odada mı kontrol et
  const existingRoom = await findUserInAnyRoom(userAddress);
  if (existingRoom) {
    socket.join(existingRoom.roomId);
    socket.emit('room-joined', existingRoom);
    return;
  }
  
  // 2. Bekleyen oda var mı kontrol et (aynı bet amount)
  const waitingRoom = await findWaitingRoom(betAmount);
  if (waitingRoom) {
    // Mevcut odaya katıl
    waitingRoom.players.push({
      socketId: socket.id,
      userAddress,
      ready: false,
      dice: null
    });
    
    socket.join(waitingRoom.roomId);
    
    // Oda dolu, oyun başlayabilir
    if (waitingRoom.players.length === 2) {
      waitingRoom.gameState = 'ready';
      io.to(waitingRoom.roomId).emit('room-full', waitingRoom);
    }
    
    socket.emit('room-joined', waitingRoom);
    return;
  }
  
  // 3. Yeni oda oluştur
  const roomId = generateRoomId(); // "room_" + nanoid()
  const newRoom = {
    roomId,
    players: [{
      socketId: socket.id,
      userAddress,
      ready: false,
      dice: null
    }],
    gameState: 'waiting',
    betAmount,
    createdAt: new Date(),
    winner: null
  };
  
  // Memory + Redis'e kaydet
  gameManager.rooms.set(roomId, newRoom);
  await redis.set(`room:${roomId}`, JSON.stringify(newRoom));
  await redis.set(`user-room:${userAddress}`, roomId); // User → Room mapping
  
  socket.join(roomId);
  socket.emit('room-joined', newRoom);
});
```

## 7. Sayfa Yenileme → Room Recovery

### Frontend Reconnection Logic
```javascript
// pickANumber.jsx - useEffect içinde
useEffect(() => {
  // Socket bağlantısı kurulduğunda otomatik recovery dene
  socket.on('connect', () => {
    if (userAddress) {
      // Backend'den mevcut room bilgisini iste
      socket.emit('recover-room', { userAddress });
    }
  });
  
  socket.on('room-recovered', (roomData) => {
    if (roomData) {
      setRoomData(roomData);
      setGameState(roomData.gameState);
      // UI'ı room durumuna göre ayarla
    }
  });
  
  socket.on('no-active-room', () => {
    // Kullanıcı herhangi bir odada değil
    setRoomData(null);
    setGameState('idle');
  });
}, [userAddress]);
```

### Backend Recovery Handler
```javascript
// socketServer.js
socket.on('recover-room', async (data) => {
  const { userAddress } = data;
  
  try {
    // Redis'ten user → room mapping'i al
    const roomId = await redis.get(`user-room:${userAddress}`);
    
    if (!roomId) {
      socket.emit('no-active-room');
      return;
    }
    
    // Room data'yı al
    const roomData = await gameManager.getRoomData(roomId);
    
    if (!roomData) {
      // Room silindi/expire oldu
      await redis.del(`user-room:${userAddress}`);
      socket.emit('no-active-room');
      return;
    }
    
    // Kullanıcının socket ID'sini güncelle
    const playerIndex = roomData.players.findIndex(p => p.userAddress === userAddress);
    if (playerIndex !== -1) {
      roomData.players[playerIndex].socketId = socket.id;
      await gameManager.updateRoomData(roomId, roomData);
    }
    
    // Socket'i room'a tekrar join et
    socket.join(roomId);
    socket.emit('room-recovered', roomData);
    
  } catch (error) {
    socket.emit('no-active-room');
  }
});
```

## 8. Edge Cases ve Error Handling

### A. Disconnect Handling
```javascript
// socketServer.js
socket.on('disconnect', async () => {
  // Kullanıcının hangi room'da olduğunu bul
  const userRoom = await findRoomBySocketId(socket.id);
  
  if (userRoom) {
    // Oyun devam ediyorsa beklet (30 saniye)
    if (userRoom.gameState === 'playing') {
      setTimeout(async () => {
        const currentRoom = await gameManager.getRoomData(userRoom.roomId);
        const player = currentRoom.players.find(p => p.socketId === socket.id);
        
        if (player && !player.reconnected) {
          // 30 saniye içinde dönmedi, otomatik kaybettir
          await handlePlayerForfeit(userRoom.roomId, player.userAddress);
        }
      }, 30000);
    } else {
      // Oyun başlamamış, room'dan çıkar
      await removePlayerFromRoom(userRoom.roomId, socket.id);
    }
  }
});
```

### B. Duplicate Connection
```javascript
socket.on('join-room', async (data) => {
  // Aynı user address'ten başka aktif bağlantı var mı?
  const existingSockets = await findSocketsByUserAddress(data.userAddress);
  
  existingSockets.forEach(oldSocketId => {
    if (oldSocketId !== socket.id) {
      // Eski bağlantıyı kick et
      io.to(oldSocketId).emit('duplicate-connection');
      io.sockets.sockets.get(oldSocketId)?.disconnect();
    }
  });
  
  // Normal flow devam et...
});
```

### C. Room Expiry
```javascript
// gameManager.js - Background job
setInterval(async () => {
  const expiredRooms = await findExpiredRooms(); // 10 dakika idle
  
  for (const room of expiredRooms) {
    // Oyuncuları bilgilendir
    io.to(room.roomId).emit('room-expired');
    
    // Room'u temizle
    await cleanupRoom(room.roomId);
  }
}, 60000); // Her dakika kontrol et
```

### D. Invalid State Recovery
```javascript
// Frontend - Error boundary
const validateRoomState = (roomData) => {
  // Room data bozuksa baştan başlat
  if (!roomData.players || roomData.players.length === 0) {
    socket.emit('leave-room');
    setRoomData(null);
    return false;
  }
  
  return true;
};
```

## 9. Frontend WebSocket Entegrasyonu

```javascript
// pickANumber.jsx içine eklenecek
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Room'a katılma
const joinRoom = () => {
  socket.emit('join-room', { 
    userAddress, 
    betAmount: amount 
  });
};

// WebSocket event listeners
useEffect(() => {
  socket.on('room-joined', (roomData) => {
    setRoomData(roomData);
  });
  
  socket.on('game-start', () => {
    setIsRolling(true);
  });
  
  socket.on('dice-results', (results) => {
    setDiceResults(results);
  });
  
  socket.on('game-end', (gameResult) => {
    handleGameEnd(gameResult);
  });
}, []);
```

## 10. UI State Management

### Frontend State Sync
```javascript
// pickANumber.jsx
const [gamePhase, setGamePhase] = useState('idle'); // idle, waiting, ready, playing, finished
const [roomData, setRoomData] = useState(null);

// Phase'e göre UI render
{gamePhase === 'idle' && <StartGameButton />}
{gamePhase === 'waiting' && <WaitingForOpponent roomData={roomData} />}
{gamePhase === 'ready' && <GameReadyScreen />}
{gamePhase === 'playing' && <DiceRollingScreen />}
```

## 11. Performance Optimizasyonları

### Redis Pipeline
```javascript
// Tek tek request yerine batch
const pipeline = redis.pipeline();
pipeline.set('room:123', roomData);
pipeline.set('room:124', roomData2);
await pipeline.exec(); // Tek seferde gönder
```

### Connection Pooling
```javascript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  lazyConnect: true,
  maxRetriesPerRequest: 1, // Fast fail
  retryDelayOnFailover: 50 // Hızlı retry
});
```

### Critical Path Optimization
```javascript
// Zar atma anında - Memory kullan
socket.on('roll-dice', (data) => {
  const room = gameManager.activeRooms.get(data.roomId); // 0ms
  
  if (room.players.length === 2 && room.gameState === 'ready') {
    // Anında dice roll
    const diceResults = generateDiceResults();
    
    // Anında broadcast
    io.to(data.roomId).emit('dice-results', diceResults);
  }
});
```

## 12. Monitoring ve Debug

```javascript
// Backend - Room durumlarını logla
setInterval(() => {
  const activeRooms = Array.from(gameManager.rooms.values());
  console.log(`Active rooms: ${activeRooms.length}`);
  console.log(`Waiting rooms: ${activeRooms.filter(r => r.gameState === 'waiting').length}`);
}, 30000);
```

## 13. Performans Hedefleri

- **Dice roll response**: <50ms
- **Room join**: <100ms
- **Game state sync**: <30ms

## 14. Implementation Sırası

### Phase 1 - Başlangıç
```
✅ Memory kullan (tek server, development)
✅ Basic room system
✅ WebSocket kurulumu
❌ Redis karmaşıklığı şimdilik gereksiz
```

### Phase 2 - Production Hazırlık
```
✅ Hibrit sistem (Memory + Redis)
✅ Critical path → Memory
✅ Persistence → Redis
✅ Error handling
✅ Edge case management
```

## 15. Güvenlik Önlemleri

- **Input validation**: Tüm client input'ları validate et
- **Rate limiting**: Socket event'leri için rate limit
- **Authentication**: User address doğrulama
- **Anti-cheat**: Game logic backend'de

---

Bu guide ile multiplayer dice game sistemini baştan sona implement edebilirsiniz. Her phase'i adım adım takip ederek güvenli ve scalable bir sistem oluşturabilirsiniz.