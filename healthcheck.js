import http from "http"

const options = {
  host: "localhost",
  port: 3000,
  path: "/api/bot/health",
  timeout: 5000, // Increased timeout to 5 seconds
}

const request = http.request(options, (res) => {
  let data = ""

  res.on("data", (chunk) => {
    data += chunk
  })

  res.on("end", () => {
    if (res.statusCode === 200) {
      process.exit(0)
    } else {
      console.error(`[healthcheck] Failed with status ${res.statusCode}: ${data}`)
      process.exit(1)
    }
  })
})

request.on("error", (err) => {
  console.error(`[healthcheck] Request error: ${err.message}`)
  process.exit(1)
})

request.on("timeout", () => {
  console.error("[healthcheck] Request timeout")
  request.destroy()
  process.exit(1)
})

request.end()
