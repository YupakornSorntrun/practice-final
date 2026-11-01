const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const router = express.Router();

// GET /api/v1/menu?available=true|false&page=1&limit=10
// คืนรายการเมนู กรองตามสถานะพร้อมขาย และแบ่งหน้า
router.get("/", async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = page * limit;

    let sql = "SELECT id, name, price, available FROM menu_items";
    if (req.query.available !== undefined) {
      sql += ` WHERE available = '${req.query.available}'`;
    }
    sql += ` ORDER BY id LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query(sql);
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
    // เมนูที่ถูกอ้างอิงใน order_items ลบไม่ได้ (foreign key)
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: { code: "MENU_IN_USE", message: "เมนูนี้มีอยู่ในคำสั่งซื้อแล้ว ลบไม่ได้" },
      });
    }
    next(err);
  }
});

module.exports = router;
