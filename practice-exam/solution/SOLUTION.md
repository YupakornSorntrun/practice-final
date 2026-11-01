# เฉลยและคำอธิบาย (เปิดหลังทำเสร็จเท่านั้น)

วิธีตรวจเฉลย: คัดลอก `solution/routes/*` ไปทับ `routes/` และ `solution/tests/*` ไปไว้ใน `tests/` แล้ว `npm run seed && npm test` → ต้องผ่าน 30/30

## โจทย์ 1 — จุดที่มักเสียคะแนน
1. ใช้ `pool.query` ภายใน transaction → แต่ละคำสั่งอาจได้ connection คนละตัว transaction จึงไม่มีผลจริง ต้องใช้ `connection.query` จาก `pool.getConnection()`
2. ลืม `rollback()` ก่อน `return` ในกรณี 404/409 หรือลืม `connection.release()` → connection รั่ว พอเรียกครบ `connectionLimit` (10) ระบบค้าง ใส่ `release()` ใน `finally`
3. ตรวจด้วย `typeof x === "number"` อย่างเดียว → `1.5` ผ่าน ต้องใช้ `Number.isInteger`
4. `price` จาก MySQL DECIMAL ได้มาเป็น string (`"60.00"`) ต้อง `Number(price)` ก่อนคูณ ไม่งั้นได้ string ต่อกัน
5. ตรวจ validation **ก่อน** เปิด connection เพื่อไม่เปลืองทรัพยากร

## โจทย์ 2 — สาเหตุ (ตัวอย่างการเขียน)
- **available**: โค้ดต่อ string `'${req.query.available}'` เข้า SQL ตรง ๆ ทำให้ (1) MySQL เทียบคอลัมน์ BOOLEAN (0/1) กับ string `'true'` ซึ่งถูกแปลงเป็นตัวเลข 0 จึงได้เมนูที่ *หมด* แทน และ (2) ผู้ใช้ใส่ `' OR '1'='1` ได้ = SQL Injection (OWASP A05) แก้โดยรับเฉพาะ `true/false` แปลงเป็น 1/0 และใช้ `?` parameterized query
- **pagination**: `offset = page * limit` ทำให้หน้า 1 ข้ามไป `limit` แถวแรก ที่ถูกคือ `(page - 1) * limit`
- **สิทธิ์**: route มีแค่ `authenticateToken` (ยืนยันว่าเป็นใคร) แต่ไม่มี `authorizeRole("staff")` (ตรวจว่ามีสิทธิ์ไหม) customer จึงแก้สถานะได้ = Broken Access Control (A01) — Authentication ≠ Authorization
- **status**: ไม่ validate ค่าก่อน UPDATE จึงบันทึกค่าอะไรก็ได้ลงฐานข้อมูล
- **ไม่พบ order**: UPDATE ที่ไม่ตรงแถวใดไม่ throw error แต่คืน `affectedRows = 0` โค้ดเดิมไม่ตรวจจึงตอบ 200 ทั้งที่ไม่มีอะไรเปลี่ยน

## โจทย์ 3 — บั๊กที่เทสต์ควรเจอ
`GET /api/v1/menu/:id` เมื่อไม่พบคืน `200` พร้อม `data: undefined` (JSON จึงไม่มี key `data`) เพราะไม่ได้ตรวจ `rows.length === 0` แก้โดยคืน `404 MENU_NOT_FOUND`

จุดสำคัญของเทสต์ที่ดี
- **รันซ้ำได้**: ห้ามลบเมนู seed ตรง ๆ (รอบสองจะได้ 404) → สร้างเมนูชั่วคราวใน `beforeAll` แล้วลบทิ้ง/เก็บกวาดใน `afterAll`
- **assert ให้ครบ**: ตรวจทั้ง status, `error.code` และสถานะในฐานข้อมูล (ลบแล้วหายจริง / 403 แล้วยังอยู่)
- **mock**: `jest.mock("../db", () => ({ pool: { query: jest.fn() } }))` ต้องอยู่บนสุดของไฟล์ และควรแยกไฟล์ เพราะ mock มีผลทั้งไฟล์
- `afterAll(() => pool.end())` ในไฟล์ที่ใช้ DB จริง ไม่งั้น Jest ไม่ยอมจบ
