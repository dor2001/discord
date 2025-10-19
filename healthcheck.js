// Simple healthcheck script for Docker
import http from "http"

const options = {
  host: "localhost",
  port: 3000,
  path: "/api/bot/health",
  timeout: 2000,
}

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0)
  } else {
    process.exit(1)
  }
})

request.on("error", () => {
  process.exit(1)
})

request.end()
