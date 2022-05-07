//forever -o out.log -e error.log -a start app.js
//forever list
//forever restartall
var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.get("/room/*", function (req, res) {
  res.sendFile(__dirname + "/client/room.html");
});

app.use("/client", express.static(__dirname + "/client"));

serv.listen(39200);

console.log("Server started.");
//common
var removePlayer = (arr, target) => {
  var idx = arr.indexOf(target);
  for (var idx = 0; idx < arr.length; idx++) {
    if (arr[idx].id == target) {
      arr[idx] = {};
    }
  }
};
var addPlayer = (arr, playerid) => {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id) continue;
    arr[i] = {
      id: playerid,
      name: playerid,
    };
    return true;
  }
  return false;
};

var io = require("socket.io")(serv, {});

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var ROOM_LIST = {};
var ROOM_MAX_PLAYERS = 2;
//str=room/12345
function genPlayers(players) {
  var emptyPlayers = [];
  for (var idx = 0; idx < ROOM_MAX_PLAYERS; idx++) {
    emptyPlayers.push({
      name: "-",
      arrows: 5,
      circles: 5,
      squares: 5,
      points: 0,
      turn: false,
    });
    if (players && players[idx].id) {
      emptyPlayers[idx].id = players[idx].id;
      emptyPlayers[idx].name = players[idx].name;
    }
  }
  return emptyPlayers;
}
function genBoards() {
  var boxes = [];
  for (var row = 0; row < 4; row++) {
    var boxRow = [];
    for (var col = 0; col < 4; col++) {
      var initBox = {
        color: "rgb(255,255,255)",
        blues: [1, 1, 1],
        reds: [1, 1, 1],
        arrowDir: -1,
      };
      boxRow.push(initBox);
    }
    boxes.push(boxRow);
  }
  return boxes;
}
function createRoom(roomid) {
  ROOM_LIST[roomid] = {
    players: genPlayers(),
    boxArray: genBoards(),
  };
}
function joinRoom(playerid, roomid) {
  //如果没有这个房间，创建
  if (!ROOM_LIST[roomid]) {
    createRoom(roomid);
  }
  //如果房间不足两人，加入
  if (addPlayer(ROOM_LIST[roomid].players, playerid)) {
    console.log("Player[", playerid, "] Entered the Room:", roomid);
    io.sockets.emit(`serverJoinRoom${roomid}`, {
      status: "success",
      playerid,
      roomid,
    });
  } else {
    //如果房间人满了，就弹出，房间已满
    io.sockets.emit(`serverJoinRoom${roomid}`, {
      status: "full",
      playerid,
      roomid,
    });
  }
}
function leaveRoom(playerid, roomid) {
  console.log("Player[", playerid, "] Leaved the Room:", roomid);
  io.sockets.emit(`serverLeaveRoom${roomid}`, {
    playerid,
  });

  removePlayer(ROOM_LIST[roomid].players, playerid);
  if (
    ROOM_LIST[roomid].players[0].id == 0 &&
    ROOM_LIST[roomid].players[1].id == 0
  ) {
    delete ROOM_LIST[roomid];
  }
}

function calBoards(roomid) {
  var roomData = ROOM_LIST[roomid];
  for (var boxRow of roomData.boxArray) {
    for (var box of boxRow) {
      for (var type = 0; type < 3; type++) {
        //1.如果标志curr(2)，则移到done(3)
        if (box.blues[type] == 2) box.blues[type] = 3;
        else if (box.reds[type] == 2) box.reds[type] = 3;
        //2.如果标志已done(3)，则将另一种颜色的标志设为-1
        if (box.blues[type] == 3) box.reds[type] = -1;
        else if (box.reds[type] == 3) box.blues[type] = -1;
      }
    }
  }
}
function updateBox(data, roomid) {
  var { i, j, playerIdx, type } = data;
  var roomData = ROOM_LIST[roomid];
  var colorName = playerIdx == 0 ? "blues" : "reds";
  if (roomData.players[playerIdx].turn) {
    roomData.players[playerIdx].turn = false;

    roomData.players[1 - playerIdx].turn = true;
    roomData.boxArray[i][j][colorName][type] = 2;
    calBoards(roomid);
    roomData.boxArray[i][j][colorName][type] = 2;
    if (type == 0) {
      roomData.boxArray[i][j].arrowDir = Math.floor(Math.random() * 4);
    }
  }
}
function startGame(data, roomid) {
  var init = Math.floor(Math.random() * 2);
  ROOM_LIST[roomid] = {
    players: genPlayers(data.players),
    boxArray: genBoards(),
  };
  ROOM_LIST[roomid].players[init].turn = true;
}
io.sockets.on("connection", function (socket) {
  var PLAYER_ID = socket.id;
  var ROOM_ID = socket.handshake.query.roomid;

  SOCKET_LIST[PLAYER_ID] = socket;
  joinRoom(PLAYER_ID, ROOM_ID);
  io.sockets.emit(`serverUpdate${ROOM_ID}`, ROOM_LIST[ROOM_ID]);
  socket.on("disconnect", function () {
    delete SOCKET_LIST[PLAYER_ID];
    leaveRoom(PLAYER_ID, ROOM_ID);
    io.sockets.emit(`serverUpdate${ROOM_ID}`, ROOM_LIST[ROOM_ID]);
  });
  socket.on("clientEvent", function (data) {
    var { eventName, eventData } = data;
    console.log("Room[ ", ROOM_ID, " ] Received Event:", eventName);
    switch (eventName) {
      case "updateBox":
        updateBox(eventData, ROOM_ID);
        break;
      case "startGame":
        startGame(eventData, ROOM_ID);
        break;
    }
    io.sockets.emit(`serverUpdate${ROOM_ID}`, ROOM_LIST[ROOM_ID]);
  });
});

// setInterval(function () {
//   for (var roomKey in ROOM_LIST) {
//     var room = ROOM_LIST[roomKey];
//     io.sockets.emit(`room-${roomKey}`, room);
//   }
// }, 1000 / 25);
