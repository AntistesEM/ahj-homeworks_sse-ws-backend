const db = require('../../db/index') ;
// Импортируем модуль ws для работы с WebSocket
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Создаем новый сервер WebSocket, который будет слушать на порту 8080
const wss = new WebSocket.Server({ port: 8080 });

let clientId;
let listUsers = [];  // делаем список активных пользователей
let nameToRemove;  // имя ушедшего из чата

// Событие 'connection' срабатывает, когда новый клиент подключается к серверу
wss.on('connection', function connection(ws) {
  if (Object.values(db).length === 0) {
    clientId = uuidv4();
    db[clientId] = [ws, {name: "", messages:[], date: ""}];
    console.log("В чат добавден новый клиент");
  } else if (Object.values(db).length > 0) {
    if (!Object.values(db).includes(ws)) {
      clientId = uuidv4();
      db[clientId] = [ws, {name: "", messages:[], date: ""}];
      console.log("В чат добавден новый клиент");
    } else if (!Object.values(db).includes(ws)) {
      console.log("Такой клиент уже активен!");
    }
  }

  // Выводим сообщение в консоль, когда новый клиент подключается
  console.log('A new client connected!');

  // Событие 'message' срабатывает, когда клиент отправляет сообщение серверу
  ws.on('message', function incoming(message) {
      const msg = JSON.parse(message.toString());
      const keys = Object.keys(msg)[0];

    if (keys === "userName") {
      let errorSent = false; // флаг для отслеживания, была ли отправлена ошибка

      const name = msg.userName; // получили имя из сообщения
      const listClients = Object.values(db); // получили список из списков формата [ws, {name: "", messages:[], date: "date"}]

      listClients.forEach((client) => {
        const clientName = client[1];
        
        if (clientName.name === name) {
          // Отправляем специальное сообщение с ошибкой клиенту
          const errorMessage = JSON.stringify({ error: 'Ошибка: Такой псевдоним уже занят!' });

          ws.send(errorMessage);

          errorSent = true; // устанавливаем флаг, что ошибка была отправлена
        }
      })

      if (!errorSent) { // если ошибка не была отправлена
        db[clientId][1].name = name;
        listUsers.push(name);
        const okMessage = JSON.stringify({
          name: { name: name }
        });

        ws.send(okMessage);
        
        // Отправляем список активных пользователей
        const clients = Array.from(wss.clients);
        clients.filter(client => client.readyState === WebSocket.OPEN)
          .forEach((client) => {
            client.send(JSON.stringify({list: listUsers}))
          });
      }

    } else if (keys === "message") {
      const messageEv = JSON.stringify({ chat: msg });
      
      const clients = Array.from(wss.clients);
      clients.filter(client => client.readyState === WebSocket.OPEN)
        .forEach((client) => client.send(messageEv));
      
      // Выводим полученное сообщение в консоль
      console.log('received: %s', message);
    } else if (keys === "close") {
      nameToRemove = msg.close;
    }
  });

  // Событие 'close' срабатывает, когда клиент отключается от сервера
  ws.on('close', function close() {
    const index = listUsers.indexOf(nameToRemove);

    if (index !== -1) {
      listUsers.splice(index, 1);
    }
    
    delete db[clientId];

    const clients = Array.from(wss.clients);
    clients.filter(client => client.readyState === WebSocket.OPEN)
      .forEach((client) => {
        client.send(JSON.stringify({ list: listUsers }));
      });
    
    console.log('Client disconnected');
  });
});

console.log('WebSocket server started on port 8080');
