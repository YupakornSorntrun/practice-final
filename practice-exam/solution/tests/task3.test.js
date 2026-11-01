// เฉลยโจทย์ที่ 3 (ส่วนเทสต์กับฐานข้อมูลจริง)
const request = require("supertest");
const app = require("../app");
const { pool } = require("../db");
const { tokenFor } = require("./helpers");

const staff = tokenFor("staff", 100, "พนักงาน");
const customer = tokenFor("customer", 7, "ลูกค้า");
let tempMenuId;

beforeAll(async () => {
  // Arrange: สร้างเมนูชั่วคราวสำหรับทดสอบการลบ → รันเทสต์ซ้ำกี่รอบก็ไม่พัง
  const [result] = await pool.query(
    "INSERT INTO menu_items (name, price, available) VALUES ('เมนูทดสอบ', 10.00, TRUE)"
  );
  tempMenuId = result.insertId;
});

afterAll(async () => {
  await pool.query("DELETE FROM menu_items WHERE id = ?", [tempMenuId]); // เผื่อเทสต์ลบไม่สำเร็จ
  await pool.end();
});

describe("GET /api/v1/menu/:id", () => {
  test("200 พร้อมข้อมูลเมนูเมื่อพบ", async () => {
    const res = await request(app).get("/api/v1/menu/1");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 1, name: "ข้าวผัดกุ้ง", price: "60.00", available: 1 });
  });

  test("404 MENU_NOT_FOUND เมื่อไม่พบ", async () => {
    const res = await request(app).get("/api/v1/menu/9999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
  });
});

describe("DELETE /api/v1/menu/:id", () => {
  test("401 เมื่อไม่แนบ token", async () => {
    const res = await request(app).delete(`/api/v1/menu/${tempMenuId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_TOKEN");
  });

  test("401 INVALID_TOKEN เมื่อ token ถูกปลอม/ผิด secret", async () => {
    const res = await request(app)
      .delete(`/api/v1/menu/${tempMenuId}`)
      .set("Authorization", "Bearer abc.def.ghi");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  test("403 เมื่อ role เป็น customer และเมนูต้องยังอยู่", async () => {
    const res = await request(app)
      .delete(`/api/v1/menu/${tempMenuId}`)
      .set("Authorization", `Bearer ${customer}`);
    expect(res.status).toBe(403);
    const [rows] = await pool.query("SELECT id FROM menu_items WHERE id = ?", [tempMenuId]);
    expect(rows).toHaveLength(1);
  });

  test("409 MENU_IN_USE เมื่อลบเมนูที่มีในคำสั่งซื้อแล้ว (id 1)", async () => {
    const res = await request(app)
      .delete("/api/v1/menu/1")
      .set("Authorization", `Bearer ${staff}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("MENU_IN_USE");
  });

  test("200 เมื่อ staff ลบ และลบออกจากฐานข้อมูลจริง", async () => {
    const res = await request(app)
      .delete(`/api/v1/menu/${tempMenuId}`)
      .set("Authorization", `Bearer ${staff}`);
    expect(res.status).toBe(200);
    const [rows] = await pool.query("SELECT id FROM menu_items WHERE id = ?", [tempMenuId]);
    expect(rows).toHaveLength(0);
  });

  test("404 เมื่อลบเมนูที่ไม่มีอยู่", async () => {
    const res = await request(app)
      .delete("/api/v1/menu/9999")
      .set("Authorization", `Bearer ${staff}`);
    expect(res.status).toBe(404);
  });
});
