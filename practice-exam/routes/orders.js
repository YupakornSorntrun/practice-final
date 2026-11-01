const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const router = express.Router();

const ALLOWED_STATUS = ["pending", "preparing", "delivering", "delivered", "cancelled"];

// GET /api/v1/orders/:id  — ดูคำสั่งซื้อพร้อมรายการอาหารและยอดรวม (ต้องล็อกอิน)
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      "SELECT id, customer_name, status, created_at FROM orders WHERE id = ?",
      [req.params.id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" } });
    }
    const [items] = await pool.query(
      `SELECT oi.menu_item_id, m.name, m.price, oi.quantity
         FROM order_items oi
         JOIN menu_items m ON m.id = oi.menu_item_id
        WHERE oi.order_id = ?
        ORDER BY oi.id`,
      [req.params.id]
    );
    const total = items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
    res.status(200).json({ data: { ...orders[0], items, total } });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// โจทย์ที่ 1: POST /api/v1/orders  (เขียนเพิ่มตรงนี้)
// ดูรายละเอียดใน TASKS.md
// ============================================================


// PATCH /api/v1/orders/:id/status  — เปลี่ยนสถานะคำสั่งซื้อ (ควรเป็นของ staff เท่านั้น)
router.patch("/:id/status", authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.body;
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
    res.status(200).json({ message: "อัปเดตสถานะสำเร็จ", data: { id: Number(req.params.id), status } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
