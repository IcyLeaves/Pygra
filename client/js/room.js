var app = new Vue({
  el: "#app",
  data: {
    socket: undefined,
    roomid: 0,
    ROOM_DATA: {},
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
    clickBox(e) {
      var i = parseInt(e.target.dataset.i);
      var j = parseInt(e.target.dataset.j);
      var r = Math.floor(Math.random() * 256);
      var g = Math.floor(Math.random() * 256);
      var b = Math.floor(Math.random() * 256);
      var color = `rgb(${r},${g},${b})`;
      this.clientEvent("updateBox", {
        i,
        j,
        color,
      });
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
      console.log("send", data);
      this.socket.emit("clientEvent", data);
    },
    serverUpdate(data) {
      console.log(data);
      this.ROOM_DATA = data;
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
