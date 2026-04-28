const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

wss.on('connection', function(ws) {
    console.log('Yeni bağlantı');
    var currentRoom = null;
    var isHost = false;

    ws.on('message', function(message) {
        try {
            var data = JSON.parse(message);
            
            if (data.type === 'create') {
                currentRoom = data.room;
                isHost = true;
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = { host: ws, guests: [] };
                    ws.send(JSON.stringify({ type: 'created', room: currentRoom }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Bu oda zaten var' }));
                }
            }
            
            else if (data.type === 'join') {
                currentRoom = data.room;
                if (rooms[currentRoom]) {
                    rooms[currentRoom].guests.push(ws);
                    rooms[currentRoom].host.send(JSON.stringify({ type: 'peer-joined' }));
                    ws.send(JSON.stringify({ type: 'joined', room: currentRoom }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Oda bulunamadı' }));
                }
            }
            
            else if (data.type === 'message' && currentRoom && rooms[currentRoom]) {
                var room = rooms[currentRoom];
                var msg = JSON.stringify({ type: 'message', text: data.text });
                [room.host, ...room.guests].forEach(function(client) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(msg);
                    }
                });
            }
        } catch(e) {
            console.log('Hata:', e);
        }
    });

    ws.on('close', function() {
        if (currentRoom && rooms[currentRoom]) {
            if (isHost) {
                delete rooms[currentRoom];
            } else {
                var idx = rooms[currentRoom].guests.indexOf(ws);
                if (idx > -1) rooms[currentRoom].guests.splice(idx, 1);
            }
        }
    });
});

console.log('PACDI WebSocket Sunucusu ' + PORT + ' portunda hazır.');
