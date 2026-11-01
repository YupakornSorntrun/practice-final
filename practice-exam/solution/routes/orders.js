const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const router = express.Router();

const ALLOWED_STATUS = ["pending", "preparing", "delivering", "delivered", "cancelled"];

function validationError(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
}

// GET /api/v1/orders/:id
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
// โจทย์ที่ 1: POST /api/v1/orders  (เฉลย)
// ============================================================
router.post("/", authenticateToken, async (req, res, next) => {
  const { items } = req.body;

  // 1) Validation — ตรวจก่อนแตะฐานข้อมูล
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return validationError(res, "items ต้องเป็น array ที่มี 1-20 รายการ");
  }
  for (const it of items) {
    if (!it || !Number.isInteger(it.menu_item_id) || it.menu_item_id <= 0) {
      return validationError(res, "menu_item_id ต้องเป็นจำนวนเต็มบวก");
    }
    if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 10) {
      return validationError(res, "quantity ต้องเป็นจำนวนเต็ม 1-10");
    }
  }

  // 2) Transaction — ทุก query ต้องใช้ connection เดียวกัน (ไม่ใช่ pool.query)
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const ids = items.map((it) => it.menu_item_id);
    const [menus] = await connection.query(
      "SELECT id, name, price, available FROM menu_items WHERE id IN (?)",
      [ids]
    );
    const menuById = new Map(menus.map((m) => [m.id, m]));

    for (const it of items) {
      const menu = menuById.get(it.menu_item_id);
      if (!menu) {
        await connection.rollback();
        return res.status(404).json({
          error: { code: "MENU_NOT_FOUND", message: `ไม่พบเมนู id ${it.menu_item_id}` },
        });
      }
      if (!menu.available) {
        await connection.rollback();
        return res.status(409).json({
          error: { code: "MENU_UNAVAILABLE", message: `เมนู ${menu.name} หมดแล้ว` },
        });
      }
    }

    const customerName = req.user.name || `user-${req.user.id}`;
    const [orderResult] = await connection.query(
      "INSERT INTO orders (customer_name, status) VALUES (?, 'pending')",
      [customerName]
    );
    const orderId = orderResult.insertId;

    for (const it of items) {
      await connection.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [orderId, it.menu_item_id, it.quantity]
      );
    }

    await connection.commit();

    const total = items.reduce(
      (sum, it) => sum + Number(menuById.get(it.menu_item_id).price) * it.quantity,
      0
    );
    res.status(201).json({
      data: { id: orderId, customer_name: customerName, status: "pending", items, total },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release(); // คืน connection ให้ pool เสมอ
  }
});

// PATCH /api/v1/orders/:id/status  (เฉลยโจทย์ 2B)
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRole("staff"), // [แก้บั๊ก 4] เดิมไม่มี → customer ก็เปลี่ยนสถานะได้ (A01 Broken Access Control)
  async (req, res, next) => {
    try {
      const { status } = req.body;
      // [แก้บั๊ก 5] ตรวจค่า status ก่อนบันทึก
      if (!ALLOWED_STATUS.includes(status)) {
        return validationError(res, `status ต้องเป็นหนึ่งใน ${ALLOWED_STATUS.join(", ")}`);
      }
      const [result] = await pool.query("UPDATE orders SET status = ? WHERE id = ?", [
        status,
        req.params.id,
      ]);
      // [แก้บั๊ก 6] ไม่มีแถวถูกแก้ = ไม่พบ order → 404
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" } });
      }
      res.status(200).json({ message: "อัปเดตสถานะสำเร็จ", data: { id: Number(req.params.id), status } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
