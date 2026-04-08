const app = require("./app");
const { port } = require("./config/env");
const { initDb } = require("./database/sqlite");

async function start() {
  await initDb();

  const server = app.listen(port, (error) => {
    if (error) {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the other process or change PORT in .env.`);
      } else {
        console.error("Failed to start server:", error.message);
      }
      process.exit(1);
    }

    console.log(`Server running on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    console.error("Server error:", error.message);
  });
}

start().catch((error) => {
  console.error("Startup error:", error.message);
  process.exit(1);
});
