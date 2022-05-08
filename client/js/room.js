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
    //
    COLORS: ["blue", "red"],
    TYPES: ["arrow", "circle", "square"],
    STATUS: ["-left", "-up", "-right", "-down"],
    //
    STATE: {
      USED: 0,
      NOPE: 1,
      OK: 2,
      CURR: 3,
      DONE: 4,
    },
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
      var { i, j, type } = e.target.dataset;
      i = parseInt(i);
      j = parseInt(j);
      type = parseInt(type);
      this.clientEvent("updateBox", {
        i,
        j,
        playerIdx: this.playerIdx,
        type,
      });
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
      // console.log(data);
      this.ROOM_DATA = data;
      if (data.players[0].id == this.socket.id) this.playerIdx = 0;
      else this.playerIdx = 1;
      this.isPrepared = true;
    },
    serverJoinRoom(data) {
      // console.log(data);
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
      // console.log(data);
      this.LOG_INFO("玩家" + data.playerid + "已离开房间");
    },
  },
  mounted: function () {
    //进入房间的时候获取query
    // console.log("open");
    this.roomid = window.location.pathname.split("/")[2];
    this.socket = io({
      query: { roomid: this.roomid },
    });
    this.socket.on(`serverJoinRoom${this.roomid}`, this.serverJoinRoom);
    this.socket.on(`serverLeaveRoom${this.roomid}`, this.serverLeaveRoom);
    this.socket.on(`serverUpdate${this.roomid}`, this.serverUpdate);
  },
});
