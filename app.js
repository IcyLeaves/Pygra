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
//给定colorName和type得出一个标志的state:
//USED: 已被另一种颜色使用
//NOPE: 没被使用但也不可点击
//OK: 可以点击
//CURR: 上一步刚使用
//DONE: 已归档

var STATE = {
  USED: 0,
  NOPE: 1,
  OK: 2,
  CURR: 3,
  DONE: 4,
};
function genBoards() {
  var boxes = [];
  for (var row = 0; row < 4; row++) {
    var boxRow = [];
    for (var col = 0; col < 4; col++) {
      var initBox = {
        color: "rgb(255,255,255)",
        signs: [
          [STATE.OK, STATE.OK, STATE.OK],
          [STATE.OK, STATE.OK, STATE.OK],
        ],
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

function straight(doubleArr, x, y, dir) {
  let M = doubleArr.length;
  let N = doubleArr[0].length;
  x = parseInt(x);
  y = parseInt(y);
  var res = [];
  var dx = [0, -1, 0, 1];
  var dy = [-1, 0, 1, 0];
  x += dx[dir];
  y += dy[dir];
  while (0 <= x && x < M && 0 <= y && y < N) {
    res.push(doubleArr[x][y]);
    x += dx[dir];
    y += dy[dir];
  }
  return res;
}
function nearEight(doubleArr, x, y) {
  let M = doubleArr.length;
  let N = doubleArr[0].length;
  x = parseInt(x);
  y = parseInt(y);
  var res = [];
  var d = [-1, 0, 1];
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      if (i == 1 && j == 1) continue;
      var nx = x + d[i];
      var ny = y + d[j];
      if (nx < 0 || nx >= M || ny < 0 || ny >= N) {
        res.push(undefined);
        continue;
      }
      res.push(doubleArr[nx][ny]);
    }
  }
  return res;
}

function updateBox(data, roomid) {
  var { i, j, playerIdx, type } = data;
  var roomData = ROOM_LIST[roomid];
  if (roomData.players[playerIdx].turn) {
    //递交回合
    roomData.players[playerIdx].turn = false;
    roomData.players[1 - playerIdx].turn = true;
    //CURR->DONE
    if (roomData.lastCurr) {
      roomData.boxArray[roomData.lastCurr.x][roomData.lastCurr.y].signs[
        1 - playerIdx
      ][roomData.lastCurr.type] = STATE.DONE;
    }
    //CURR
    var currBox = roomData.boxArray[i][j];
    currBox.signs[playerIdx][type] = STATE.CURR;
    if (type == 0) {
      currBox.arrowDir = Math.floor(Math.random() * 4);
    }
    //lastCurr=CURR
    roomData.lastCurr = {
      x: i,
      y: j,
      type,
    };
    //另一个颜色type->USED
    currBox.signs[1 - playerIdx][type] = STATE.USED;
    //检查是否可以计分
    var checkComplete = () => {
      var cnt = 0;
      var res = 0; //蓝加红减
      for (var colorIdx in currBox.signs) {
        for (var sign of currBox.signs[colorIdx]) {
          if (sign == STATE.USED || sign == STATE.NOPE || sign == STATE.OK)
            continue;
          cnt++;
          res += colorIdx == 0 ? 1 : -1;
        }
      }
      if (cnt < 3) return -1;
      if (res > 0) return 0;
      return 1;
    };
    var result = checkComplete();
    if (result != -1) {
      roomData.players[result].points++;
      var bgColor = ["#E3F2FD", "#FCE4EC"];
      currBox.color = bgColor[result];
    }
    //上一步OK->NOPE
    for (var boxRow of roomData.boxArray) {
      for (var box of boxRow) {
        for (var color of box.signs) {
          for (var signIdx in color) {
            if (color[signIdx] == STATE.OK) color[signIdx] = STATE.NOPE;
          }
        }
      }
    }
    //NOPE->OK
    var boxGoOK = (box) => {
      var res = false;
      for (var color of box.signs) {
        for (var signIdx in color) {
          if (color[signIdx] == STATE.NOPE) {
            color[signIdx] = STATE.OK;
            res = true;
          }
        }
      }
      return res;
    };
    var res = false;
    switch (type) {
      case 0:
        //如果下的是箭头
        for (var line of straight(roomData.boxArray, i, j, currBox.arrowDir)) {
          if (boxGoOK(line)) {
            res = true;
          }
        }
        break;
      case 1:
        //如果下的是圆形
        res = boxGoOK(currBox);
        break;
      case 2:
        //如果下的是方形
        for (var near of nearEight(roomData.boxArray, i, j)) {
          if (!near) continue;
          if (boxGoOK(near)) {
            res = true;
          }
        }
        break;
    }
    if (!res) {
      for (var boxRow of roomData.boxArray) {
        for (var box of boxRow) {
          boxGoOK(box);
        }
      }
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
