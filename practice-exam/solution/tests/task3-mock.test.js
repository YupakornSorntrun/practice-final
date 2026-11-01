// เฉลยโจทย์ที่ 3 (ส่วน mock ฐานข้อมูล) — รันได้แม้ไม่เปิด MySQL
jest.mock("../db", () => ({ pool: { query: jest.fn() } })); // ต้องอยู่บนสุดของไฟล์ (Jest hoist)
const { pool } = require("../db");
const request = require("supertest");
const app = require("../app");

afterEach(() => jest.clearAllMocks());

describe("GET /api/v1/menu/:id (mock pool)", () => {
  test("500 INTERNAL_ERROR เมื่อฐานข้อมูลล่ม", async () => {
    pool.query.mockRejectedValueOnce(new Error("Connection lost"));
    jest.spyOn(console, "error").mockImplementation(() => {}); // ปิด log ให้ output สะอาด

    const res = await request(app).get("/api/v1/menu/1");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });

  test("ส่ง id เข้า query แบบ parameter (ไม่ต่อ string)", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5, name: "ส้มตำไทย", price: "40.00", available: 1 }]]);

    const res = await request(app).get("/api/v1/menu/5");

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ?"), ["5"]);
  });
});
