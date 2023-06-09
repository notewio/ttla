class Client {

  constructor() {

    this.username = window.prompt("Enter username: ")
    this.socket = io.connect("/", {
      query: { name: this.username },
      reconnection: false, // TODO: dev only
    })
    document.getElementById("player-name").innerHTML = this.username

    this.socket.on("on-connected", this.onConnected.bind(this))
    this.socket.on("new-player", this.newPlayer.bind(this))
    this.socket.on("del-player", this.delPlayer.bind(this))
    this.socket.on("new-question", this.newQuestion.bind(this))
    this.socket.on("center", this.render.bind(this))
    this.socket.on("game-end", this.gameEnd.bind(this))

    this.playerArea = document.getElementById("playerArea")

    document.addEventListener("keydown", e => {
      if ((e.key === "1" ||
        e.key === "2" ||
        e.key === "3" ||
        e.key === "4") && (this.id ?? false)) {
        this.socket.emit("answer", {
          id: this.id,
          ans: parseInt(e.key) - 1
        })
      }
    })

  }

  onConnected(data) {

    this.id = data.id
    for (let i = 0; i < data.players.length; i++) {
      this.newPlayer(data.players[i])
    }

  }

  newPlayer(data) {

    let tractors = [...document.getElementsByClassName(data.team === 0 ? "tractor-name-red" : "tractor-name-blue")]
    if (data.team === 0) {
      tractors.reverse()
    }

    for (let i = 0; i < tractors.length; i++) {
      const element = tractors[i];
      if (element.innerHTML.length > 0) { continue }
      element.innerHTML = data.name
      element.setAttribute("data-id", data.id)
      return
    }

  }

  delPlayer(data) {

    let tractors = [...document.getElementsByClassName(data.team === 0 ? "tractor-name-red" : "tractor-name-blue")]

    for (let i = 0; i < tractors.length; i++) {
      const element = tractors[i];
      if (element.getAttribute("data-id") === data.id) {
        element.setAttribute("data-id", "")
        element.innerHTML = ""
        return
      }
    }
  }

  newQuestion(data) {
    document.getElementById("problem-html").innerHTML = data.problem
  }

  render(data) {
    document.getElementById("tractors").setAttribute("transform", `translate(${data}, 0)`)
  }

  gameEnd(data) {
    window.alert("WINNER: " + data.sign > 0 ? "RED" : "BLUE")
  }

}


let client = new Client()
