import katex from "katex"

const WIN_WIDTH = 40
const WIN_DIST = 500


class Player {
  constructor(id, name, team, socket) {
    this.id = id
    this.name = name
    this.team = team
    this.power = 0
    this.socket = socket
    this.nextCorrect = 0
    this.cooldown = 0
  }
  network() {
    return {
      id: this.id,
      name: this.name,
      team: this.team
    }
  }
}


export class GameServer {

  constructor(socket) {

    this.socket = socket

    this.players = {}

    this.started = false

    this.center = 0

  }

  addPlayer(id, name, socket) {

    if (!this.started && Object.keys(this.players).length < 10) {

      const num_blue = Object.keys(this.players).filter(id => this.players[id].team === 0).length
      const team = num_blue / Object.keys(this.players).length >= 0.5 ? 1 : 0

      socket.emit("on-connected", {
        id: id,
        players: Object.values(this.players).map(p => p.network())
      })

      this.players[id] = new Player(id, name, team, socket)
      this.socket.emit("new-player", this.players[id].network())

    }

  }

  start() {

    for (const [id, player] of Object.entries(this.players)) {

      player.nextCorrect = Math.floor(Math.random() * 4)

      let problem = this.generateProblem(player.nextCorrect)

      player.socket.emit("new-question", {
        id: id,
        problem: problem
      })
    }

    this.updateInterval = setInterval(this.update.bind(this), 1000 / 15)
    this.started = true

  }

  generateProblem(correct_index) {
    let a = [0, 0, 0, 0].map(_ => Math.round(Math.random() * 12 + 1))
    let b = [0, 0].map(_ => Math.round(Math.random() * 12 + 1))

    return katex.renderToString(`\\begin{cases}
      ${a[0]}x_1 + ${a[1]}x_2 = ${b[0]} \\\\
      ${a[2]}x_1 + ${a[3]}x_2 = ${b[1]}
    \\end{cases}
    \\\\
    \\fbox{\\text{1. $(1, 2)$}}
    \\fbox{\\text{2. $(1, 2)$}}
    \\fbox{\\text{3. $(1, 2)$}}
    \\fbox{\\text{4. $(1, 2)$}}
    `)
  }

  answer(data) {
    const player = this.players[data.id]

    if (player.cooldown === 0) {

      if (player.nextCorrect === data.ans) {
        player.power += 1
      } else {
        player.power = 0
        player.cooldown = 30
      }

      player.nextCorrect = Math.floor(Math.random() * 4)

      let problem = this.generateProblem(player.nextCorrect)

      player.socket.emit("new-question", {
        id: data.id,
        problem: problem
      })
    }

  }

  update() {

    for (const [id, player] of Object.entries(this.players)) {
      let power = player.power
      if (player.team === 0) { power = -power }
      this.center += power

      player.cooldown -= 1
      player.cooldown = Math.max(player.cooldown, 0)
    }

    this.socket.emit("center", this.center / WIN_DIST * WIN_WIDTH)

    if (Math.abs(this.center) > WIN_DIST) {
      clearInterval(this.updateInterval)
      this.socket.emit("game-end", { sign: Math.sign(this.center) })
    }

  }

}

