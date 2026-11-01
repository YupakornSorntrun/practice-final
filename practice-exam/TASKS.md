# ข้อสอบปฏิบัติ (จำลอง) — ระบบสั่งอาหารออนไลน์ — 15 คะแนน / 60 นาที

**ข้อมูลระบบ** ตาราง `menu_items` (22 เมนู, id 9 และ 18 หมด), `orders`, `order_items`
ผู้ใช้ยืนยันตัวตนด้วย JWT (`Authorization: Bearer <token>`) payload มี `{ id, role, name }`
role มี 2 ค่า: `customer`, `staff` — ในเทสต์ใช้ `tokenFor(role, id, name)` จาก `tests/helpers.js`

รูปแบบ error ของทั้งระบบ: `{ "error": { "code": "...", "message": "..." } }`

---

## โจทย์ที่ 1 (6 คะแนน) — สร้างคำสั่งซื้อ `POST /api/v1/orders`

แก้ได้เฉพาะไฟล์ `routes/orders.js` (ตรงที่มีคอมเมนต์ "โจทย์ที่ 1")

Request body:
```json
{ "items": [ { "menu_item_id": 1, "quantity": 2 }, { "menu_item_id": 15, "quantity": 3 } ] }
```

ข้อกำหนด

| # | เงื่อนไข | ผลลัพธ์ |
|---|---|---|
| 1 | ต้องล็อกอิน (role ใดก็ได้) | ไม่มี token → `401 NO_TOKEN` |
| 2 | `items` ต้องเป็น array 1–20 รายการ, `menu_item_id` เป็นจำนวนเต็มบวก, `quantity` เป็นจำนวนเต็ม 1–10 | ผิด → `400 VALIDATION_ERROR` |
| 3 | ทุกเมนูต้องมีอยู่จริง | ไม่พบ → `404 MENU_NOT_FOUND` |
| 4 | ทุกเมนูต้องพร้อมขาย (`available = TRUE`) | หมด → `409 MENU_UNAVAILABLE` |
| 5 | บันทึก `orders` (customer_name = `req.user.name`, status = `pending`) และ `order_items` ทุกรายการ **ใน transaction เดียว** | ถ้าเงื่อนไข 3–4 ไม่ผ่านหรือเกิด error ต้องไม่มีแถวใหม่ใน `orders` |
| 6 | สำเร็จ | `201` และ `data` มี `id`, `customer_name`, `status`, `items`, `total` (ตัวเลข = Σ price × quantity) |

ตรวจด้วย `npm run test:1` (ต้องผ่าน 11 เทสต์)

> คำใบ้: ทบทวน wk05 หัวข้อ 4 (Transaction) — `pool.getConnection()`, `beginTransaction`, `commit`, `rollback`, `release` ใน `finally`

---

## โจทย์ที่ 2 (4 คะแนน) — แก้บั๊กและอธิบายสาเหตุ

แก้ได้เฉพาะ `routes/menu.js` (route `GET /`) และ `routes/orders.js` (route `PATCH /:id/status`)
รัน `npm run test:2` แล้ว **อ่าน error ของ Jest ให้ครบ** ก่อนแก้

**2A** `GET /api/v1/menu?available=true|false&page=&limit=`
- `available=true` ได้เมนูผิด และค่าแปลก ๆ ใน `available` ถูกส่งตรงเข้า SQL
- `page=1` ไม่ได้เริ่มที่รายการแรก

**2B** `PATCH /api/v1/orders/:id/status`
- ต้องเป็น `staff` เท่านั้น (อื่น ๆ → `403 FORBIDDEN`)
- status ต้องเป็น `pending | preparing | delivering | delivered | cancelled` (ไม่ใช่ → `400 VALIDATION_ERROR`)
- ไม่พบ order → `404 ORDER_NOT_FOUND`

ตรวจด้วย `npm run test:2` (ต้องผ่าน 9 เทสต์) **และ** เขียนใน `ANSWERS.md` ว่าแต่ละบั๊กเกิดจากอะไร ด้วยประโยคของตัวเอง (1–3 ประโยคต่อบั๊ก)

---

## โจทย์ที่ 3 (5 คะแนน) — เขียนเทสต์ด้วย Jest + Supertest

สร้างไฟล์ใหม่ `tests/task3.test.js` (และถ้าจะ mock ให้แยกเป็น `tests/task3-mock.test.js`)
ทดสอบ route ที่มีอยู่แล้ว **ห้ามแก้ route ก่อนเขียนเทสต์**

ต้องมีอย่างน้อย:
1. `GET /api/v1/menu/:id` — กรณีพบ (`200` + ตรวจค่าใน body) และกรณีไม่พบ (ควรเป็น `404 MENU_NOT_FOUND`)
2. `DELETE /api/v1/menu/:id` — ไม่มี token (`401`), role `customer` (`403`), `staff` ลบสำเร็จ (`200` **และตรวจในฐานข้อมูลว่าหายจริง**)
3. ลบเมนูที่อยู่ในคำสั่งซื้อแล้ว → `409 MENU_IN_USE`
4. อย่างน้อย 1 เทสต์ที่ mock `pool` ด้วย `jest.mock` ให้ฐานข้อมูล error แล้วได้ `500`
5. เทสต์ต้องรันซ้ำได้หลายรอบโดยไม่พัง (คิดว่าจะลบเมนูตัวไหน?) และปิด pool หลังจบ

ถ้าเทสต์ของคุณ **เจอบั๊ก** ใน route ให้แก้ route ให้ผ่าน แล้วเขียนอธิบายสาเหตุใน `ANSWERS.md`

---

### เกณฑ์ (โดยประมาณ)

| โจทย์ | ได้คะแนนเมื่อ |
|---|---|
| 1 (6) | validation 1.5 · ตรวจเมนูมี/พร้อมขาย 1.5 · transaction ถูกต้อง (connection เดียว, rollback, release) 2 · response ถูกรูปแบบ/ยอดรวม 1 |
| 2 (4) | แก้ 2A ครบ 1.5 · แก้ 2B ครบ 1.5 · อธิบายสาเหตุถูกและเป็นภาษาตัวเอง 1 |
| 3 (5) | ครอบคลุมกรณีที่กำหนด 2.5 · assertion ชัดเจน (status + body/DB) 1 · mock ถูกวิธี 1 · รันซ้ำได้ + ปิด pool 0.5 |
