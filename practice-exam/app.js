const express = require("express");
const menuRouter = require("./routes/menu");
const ordersRouter = require("./routes/orders");

const app = express();
app.use(express.json());

app.use("/api/v1/menu", menuRouter);
app.use("/api/v1/orders", ordersRouter);

// 404 สำหรับ path ที่ไม่มี
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "ไม่พบ endpoint" } });
});

// error handler กลาง
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ" } });
});

module.exports = app;
