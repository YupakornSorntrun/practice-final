// เทสต์ตรวจโจทย์ที่ 1: POST /api/v1/orders
const request = require("supertest");
const app = require("../app");
const { pool } = require("../db");
const { tokenFor } = require("./helpers");

const customerToken = tokenFor("customer", 7, "ลูกค้าทดสอบ");

async function countOrders() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM orders");
  return rows[0].n;
}

afterAll(async () => {
  await pool.end();
});

describe("โจทย์ 1: POST /api/v1/orders", () => {
  test("201 เมื่อสั่งสำเร็จ คำนวณยอดรวมถูก และบันทึกลงทั้ง 2 ตาราง", async () => {
    // ข้าวผัดกุ้ง 60 x 2 + ชาเย็น 25 x 3 = 195
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: 1, quantity: 2 }, { menu_item_id: 15, quantity: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toEqual(expect.any(Number));
    expect(res.body.data.customer_name).toBe("ลูกค้าทดสอบ");
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.total).toBe(195);

    const [items] = await pool.query(
      "SELECT menu_item_id, quantity FROM order_items WHERE order_id = ? ORDER BY id",
      [res.body.data.id]
    );
    expect(items).toEqual([
      { menu_item_id: 1, quantity: 2 },
      { menu_item_id: 15, quantity: 3 },
    ]);
  });

  test("401 เมื่อไม่แนบ token", async () => {
    const res = await request(app).post("/api/v1/orders").send({ items: [{ menu_item_id: 1, quantity: 1 }] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_TOKEN");
  });

  test.each([
    ["ไม่ส่ง items", {}],
    ["items เป็น array ว่าง", { items: [] }],
    ["quantity เป็น 0", { items: [{ menu_item_id: 1, quantity: 0 }] }],
    ["quantity เกิน 10", { items: [{ menu_item_id: 1, quantity: 11 }] }],
    ["quantity ไม่ใช่จำนวนเต็ม", { items: [{ menu_item_id: 1, quantity: 1.5 }] }],
    ["menu_item_id เป็น string", { items: [{ menu_item_id: "1", quantity: 1 }] }],
  ])("400 VALIDATION_ERROR เมื่อ%s", async (_label, body) => {
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("404 MENU_NOT_FOUND เมื่อมีเมนูที่ไม่มีอยู่จริง และต้องไม่สร้าง order", async () => {
    const before = await countOrders();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 9999, quantity: 1 }] });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
    expect(await countOrders()).toBe(before);
  });

  test("409 MENU_UNAVAILABLE เมื่อสั่งเมนูที่หมด (ข้าวขาหมู id 9) และต้องไม่สร้าง order", async () => {
    const before = await countOrders();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: 2, quantity: 1 }, { menu_item_id: 9, quantity: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("MENU_UNAVAILABLE");
    expect(await countOrders()).toBe(before);
  });

  test("ดูคำสั่งซื้อที่เพิ่งสร้างผ่าน GET /api/v1/orders/:id ได้ยอดตรงกัน", async () => {
    const created = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: 7, quantity: 1 }] });
    expect(created.status).toBe(201);

    const res = await request(app)
      .get(`/api/v1/orders/${created.body.data.id}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(90);
    expect(res.body.data.items).toHaveLength(1);
  });
});
