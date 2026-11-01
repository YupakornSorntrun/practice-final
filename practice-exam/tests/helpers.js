// ตัวช่วยสร้าง token สำหรับเทสต์ (ไม่ต้องมีตาราง users)
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");

function tokenFor(role, id = 1, name = "ผู้ทดสอบ") {
  return jwt.sign({ id, role, name }, jwtSecret, { expiresIn: "1h" });
}

module.exports = { tokenFor };
