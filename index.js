import express from "express"
import { createServer } from "http"
import { Server as IoServer } from "socket.io"

import { fileURLToPath } from "url"
import { dirname } from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { GameServer } from "./js/server.js"

import { v4 as UUID } from "uuid"


const app = express()
const port = 1151
const http = createServer(app)
const io = new IoServer(http)
const game = new GameServer(io)


app.get("/", (_req, res) => {
  console.log("express\t:: loading index")
  res.sendFile(__dirname + "/html/index.html")
})

app.get("/start", (_req, res) => {
  console.log("game\t:: starting")
  game.start()
  res.send("started")
})

app.get("/*", (req, res, _next) => {
  var file = req.params[0]
  res.sendFile(__dirname + "/" + file)
})



http.listen(port, () => {
  console.log(`express\t:: App listening at localhost:${port}`)
})


io.on("connection", client => {

  const id = UUID()
  const name = client.handshake.query.name
  game.addPlayer(id, name, client)

  client.on("answer", data => {
    game.answer(data)
  })

  console.log(`socket\t:: connected ${name} (${id.split("-")[0]})`)

})
