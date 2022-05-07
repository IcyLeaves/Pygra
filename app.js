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
var removeEle = (arr, target) => {
  var idx = arr.indexOf(target);
  if (idx > -1) {
    arr.splice(idx, 1);
  }
};

var io = require("socket.io")(serv, {});

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var ROOM_LIST = {};
var ROOM_MAX_PLAYERS = 2;
//str=room/12345
function getRoomId(str) {
  return parseInt(str.split("/")[2]);
}
function createRoom(roomid) {
  var INIT_ROOM = {
    players: [],
  };
  ROOM_LIST[roomid] = INIT_ROOM;
}
function joinRoom(playerid, roomid) {
  //如果没有这个房间，创建
  if (!ROOM_LIST[roomid]) {
    createRoom(roomid);
  }
  //如果房间不足两人，加入
  if (ROOM_LIST[roomid].players.length < ROOM_MAX_PLAYERS) {
    console.log("Player[", playerid, "] Entered the Room", roomid);
    ROOM_LIST[roomid].players.push(playerid);
    SOCKET_LIST[playerid].room = roomid;

    io.sockets.emit(`serverJoinRoom`, {
      status: "success",
      playerid,
      roomid,
    });
  } else {
    //如果房间人满了，就弹出，房间已满
    io.sockets.emit(`serverJoinRoom`, {
      status: "full",
      playerid,
      roomid,
    });
  }
}
function leaveRoom(playerid, roomid) {
  console.log("Player[", playerid, "] Leaved the Room", roomid);
  io.sockets.emit("serverLeaveRoom", {
    playerid,
  });

  removeEle(ROOM_LIST[roomid].players, playerid);
  if (ROOM_LIST[roomid].players.length == 0) {
    delete ROOM_LIST[roomid];
  }
}
io.sockets.on("connection", function (socket) {
  var playerid = socket.id;
  var roomid = getRoomId(socket.handshake.query.roomStr);

  SOCKET_LIST[playerid] = socket;
  joinRoom(playerid, roomid);
  socket.on("disconnect", function () {
    delete SOCKET_LIST[playerid];
    leaveRoom(playerid, roomid);
  });
});

// setInterval(function () {
//   for (var roomKey in ROOM_LIST) {
//     var room = ROOM_LIST[roomKey];
//     io.sockets.emit(`room-${roomKey}`, room);
//   }
// }, 1000 / 25);
