import katex from "katex"

const WIN_WIDTH = 40
const WIN_DIST = 800


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

  removePlayer(id) {
    delete this.players[id]
    this.socket.emit("del-player", { id: id })
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
    let num_zeros = Math.floor(Math.random() * 2) + 1
    let numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9) + 1);
    for (let i = 0; i < num_zeros; i++) {
      numbers[Math.floor(Math.random() * numbers.length)] = 0
    }

    numbers = [
      numbers.slice(0, 3),
      numbers.slice(3, 6),
      numbers.slice(6, 9),
    ]

    const determinant = m =>
      m.length == 1 ?
        m[0][0] :
        m.length == 2 ?
          m[0][0] * m[1][1] - m[0][1] * m[1][0] :
          m[0].reduce((r, e, i) =>
            r + (-1) ** (i + 2) * e * determinant(m.slice(1).map(c =>
              c.filter((_, j) => i != j))), 0)

    let answers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 500))
    answers[correct_index] = determinant(numbers)

    return katex.renderToString(`
      \\begin{array}{l l}
        \\begin{vmatrix}
          ${numbers[0].join(" & ")} \\\\
          ${numbers[1].join(" & ")} \\\\
          ${numbers[2].join(" & ")} \\\\
        \\end{vmatrix}
      &
        \\begin{array}{l l}
          \\fbox{1. ${answers[0]}} &
          \\fbox{2. ${answers[1]}} \\\\
          \\fbox{3. ${answers[2]}} &
          \\fbox{4. ${answers[3]}}
        \\end{array}
      \\end{array}
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
      this.center += power * (Math.random() / 10 + 1)

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

