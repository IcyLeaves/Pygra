var app = new Vue({
  el: "#app",
  data: {
    socket: undefined,
    roomid: 0,
    ROOM_DATA: {
      players: [],
      boxArray: [],
    },
    playerIdx: -1,
    isPrepared: false,
  },
  methods: {
    LOG_SUCCESS(msg) {
      app.$message({
        message: msg,
        type: "success",
      });
    },
    LOG_INFO(msg) {
      app.$message({
        message: msg,
        type: "info",
      });
    },
    LOG_ERROR(msg) {
      app.$message({
        message: msg,
        type: "error",
      });
    },
    //UI
    clickStartBtn(e) {
      this.clientEvent("startGame", {
        players: this.ROOM_DATA.players,
      });
    },
    clickBox(e) {
      if (this.ROOM_DATA.players[this.playerIdx].turn) {
        var i = parseInt(e.target.dataset.i);
        var j = parseInt(e.target.dataset.j);

        console.log(
          "clickBox",
          this.playerIdx,
          i,
          j,
          this.ROOM_DATA.boxArray[i][j].canChoose
        );
        if (this.ROOM_DATA.boxArray[i][j].canChoose) {
          console.log("updateBox", {
            i,
            j,
            playerIdx: this.playerIdx,
            type: 1,
          });
          this.clientEvent("updateBox", {
            i,
            j,
            playerIdx: this.playerIdx,
            type: 1,
          });
        }
      }
    },
    updateBox(i, j, box) {
      $(`#box-${i}-${j}`).css("background-color", box.color);
    },
    //socket
    clientEvent(eventName, eventData) {
      var data = {
        eventName,
        eventData,
      };
      this.socket.emit("clientEvent", data);
    },
    serverUpdate(data) {
      console.log(data);
      this.ROOM_DATA = data;
      if (data.players[0].id == this.socket.id) this.playerIdx = 0;
      else this.playerIdx = 1;
      this.isPrepared = true;
      var { boxArray } = data;
      for (var i in boxArray) {
        for (var j in boxArray[i]) {
          this.updateBox(i, j, boxArray[i][j]);
        }
      }
    },
    serverJoinRoom(data) {
      console.log(data);
      if (data.status != "success") {
        if (this.socket.id == data.playerid) {
          this.LOG_ERROR("加入房间失败：人数已满");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      } else {
        this.LOG_SUCCESS("玩家" + data.playerid + "已加入房间");
      }
    },
    serverLeaveRoom(data) {
      console.log(data);
      this.LOG_INFO("玩家" + data.playerid + "已离开房间");
    },
  },
  mounted: function () {
    //进入房间的时候获取query
    console.log("open");
    this.roomid = window.location.pathname.split("/")[2];
    this.socket = io({
      query: { roomid: this.roomid },
    });
    this.socket.on(`serverJoinRoom${this.roomid}`, this.serverJoinRoom);
    this.socket.on(`serverLeaveRoom${this.roomid}`, this.serverLeaveRoom);
    this.socket.on(`serverUpdate${this.roomid}`, this.serverUpdate);
  },
});
