// เทสต์ตรวจโจทย์ที่ 2: แก้บั๊กใน GET /api/v1/menu และ PATCH /api/v1/orders/:id/status
const request = require("supertest");
const app = require("../app");
const { pool } = require("../db");
const { tokenFor } = require("./helpers");

afterAll(async () => {
  await pool.end();
});

describe("โจทย์ 2A: GET /api/v1/menu", () => {
  test("?available=true คืนเฉพาะเมนูที่พร้อมขาย", async () => {
    const res = await request(app).get("/api/v1/menu?available=true&limit=50");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(item.available).toBe(1);
    }
  });

  test("?available=false คืนเฉพาะเมนูที่หมด (seed มี 2 รายการ)", async () => {
    const res = await request(app).get("/api/v1/menu?available=false&limit=50");
    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.id).sort((a, b) => a - b)).toEqual([9, 18]);
  });

  test("?available=ค่าอื่น ต้องได้ 400 VALIDATION_ERROR", async () => {
    const res = await request(app).get("/api/v1/menu?available=' OR '1'='1");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("page=1&limit=5 ต้องได้เมนู id 1-5 (หน้าแรกต้องเริ่มที่รายการแรก)", async () => {
    const res = await request(app).get("/api/v1/menu?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.id)).toEqual([1, 2, 3, 4, 5]);
  });

  test("page=2&limit=5 ต้องได้เมนู id 6-10", async () => {
    const res = await request(app).get("/api/v1/menu?page=2&limit=5");
    expect(res.body.data.map((m) => m.id)).toEqual([6, 7, 8, 9, 10]);
  });
});

describe("โจทย์ 2B: PATCH /api/v1/orders/:id/status", () => {
  const staff = tokenFor("staff", 100, "พนักงาน");
  const customer = tokenFor("customer", 7, "ลูกค้า");

  test("customer เปลี่ยนสถานะไม่ได้ ต้องได้ 403", async () => {
    const res = await request(app)
      .patch("/api/v1/orders/3/status")
      .set("Authorization", `Bearer ${customer}`)
      .send({ status: "cancelled" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("status ที่ไม่อยู่ในรายการที่อนุญาต ต้องได้ 400", async () => {
    const res = await request(app)
      .patch("/api/v1/orders/3/status")
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "flying" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("order ที่ไม่มีอยู่จริง ต้องได้ 404", async () => {
    const res = await request(app)
      .patch("/api/v1/orders/99999/status")
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "preparing" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  test("staff เปลี่ยนสถานะได้ และค่าในฐานข้อมูลเปลี่ยนจริง", async () => {
    const res = await request(app)
      .patch("/api/v1/orders/3/status")
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "preparing" });
    expect(res.status).toBe(200);
    const [rows] = await pool.query("SELECT status FROM orders WHERE id = 3");
    expect(rows[0].status).toBe("preparing");
  });
});
