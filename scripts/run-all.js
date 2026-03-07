/**
 * Run Next.js dev and WebSocket server concurrently (optional).
 * Usage: node scripts/run-all.js
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const next = spawn("npm", ["run", "dev"], { cwd: root, stdio: "inherit", shell: true });
const ws = spawn("node", ["server/ws-server.js"], { cwd: root, stdio: "inherit" });

[next, ws].forEach((p) => {
  p.on("error", (err) => console.error(err));
  p.on("close", (code) => {
    if (code !== 0) process.exit(code);
  });
});

process.on("SIGINT", () => {
  next.kill("SIGINT");
  ws.kill("SIGINT");
  process.exit(0);
});
