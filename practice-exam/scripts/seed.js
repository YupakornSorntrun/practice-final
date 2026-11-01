// รัน seed.sql เข้า exam_db (npm run seed) — ใช้รีเซ็ตข้อมูลก่อนฝึกแต่ละรอบ
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { db } = require("../config");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "seed.sql"), "utf8");
  const conn = await mysql.createConnection({ ...db, multipleStatements: true });
  await conn.query(sql);
  await conn.end();
  console.log("seed exam_db สำเร็จ");
}

main().catch((err) => {
  console.error("seed ไม่สำเร็จ:", err.message);
  process.exit(1);
});
