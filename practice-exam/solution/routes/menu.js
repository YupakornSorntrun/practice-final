const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const router = express.Router();

// GET /api/v1/menu?available=true|false&page=1&limit=10
router.get("/", async (req, res, next) => {
  try {
    // [แก้บั๊ก 3] ตรวจ page/limit ให้เป็นจำนวนเต็มบวก และจำกัด limit ไม่ให้ใหญ่เกิน
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    // [แก้บั๊ก 2] หน้าแรก (page=1) ต้องเริ่มที่ offset 0 → (page - 1) * limit
    const offset = (page - 1) * limit;

    const params = [];
    let sql = "SELECT id, name, price, available FROM menu_items";

    if (req.query.available !== undefined) {
      // [แก้บั๊ก 1] รับเฉพาะ "true"/"false" แล้วแปลงเป็น 1/0
      // และใช้ parameterized query (?) แทนการต่อ string → กัน SQL Injection
      if (req.query.available !== "true" && req.query.available !== "false") {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "available ต้องเป็น true หรือ false" },
        });
      }
      sql += " WHERE available = ?";
      params.push(req.query.available === "true" ? 1 : 0);
    }

    sql += " ORDER BY id LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.status(200).json({ data: rows, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/menu/:id
router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, price, available FROM menu_items WHERE id = ?",
      [req.params.id]
    );
    // [แก้บั๊กที่เทสต์ของโจทย์ 3 จับได้] ไม่พบข้อมูลต้องได้ 404 ไม่ใช่ 200 + data ว่าง
    if (rows.length === 0) {
      return res.status(404).json({ error: { code: "MENU_NOT_FOUND", message: "ไม่พบเมนู" } });
    }
    res.status(200).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/menu/:id  (เฉพาะ staff)
router.delete("/:id", authenticateToken, authorizeRole("staff"), async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM menu_items WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: { code: "MENU_NOT_FOUND", message: "ไม่พบเมนู" } });
    }
    res.status(200).json({ message: "ลบเมนูสำเร็จ" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: { code: "MENU_IN_USE", message: "เมนูนี้มีอยู่ในคำสั่งซื้อแล้ว ลบไม่ได้" },
      });
    }
    next(err);
  }
});

module.exports = router;
