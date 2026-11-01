// เปิดพอร์ตจริง (npm start) — แยกจาก app.js เพื่อให้ Supertest import app ได้
const app = require("./app");
const { port } = require("./config");

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
