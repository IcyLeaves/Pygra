var app = new Vue({
  el: "#app",
  data: {
    socket: undefined,
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
    socketJoinRoom(data) {
      console.log(data);
      if (data.status != "success") {
        this.LOG_ERROR("加入房间失败");
      } else {
        this.LOG_SUCCESS("玩家" + data.playerid + "已加入房间");
      }
    },
    socketLeaveRoom(data) {
      console.log(data);
      this.LOG_INFO("玩家" + data.playerid + "已离开房间");
    },
  },
  mounted: function () {
    //进入房间的时候获取query
    console.log("open");
    this.socket = io({
      query: { roomStr: window.location.pathname },
    });
    this.socket.on(`serverJoinRoom`, this.socketJoinRoom);
    this.socket.on(`serverLeaveRoom`, this.socketLeaveRoom);
  },
});
