# ชุดฝึกข้อสอบปฏิบัติ (จำลอง) — 88736065 API for Back-End Development

> ชุดนี้ **ไม่ใช่ข้อสอบจริง** — Claude ทำขึ้นเพื่อใช้ฝึก โดยเดาจากแนวข้อสอบ (Express + MySQL + Jest, 3 โจทย์ 6/4/5 คะแนน)
> และใช้ฐานข้อมูล/โครงสร้างแบบเดียวกับ `final-exam-setup` ของอาจารย์

## เริ่มต้น (ประมาณ 5 นาที)

1. เปิดฐานข้อมูลจากโฟลเดอร์ **final-exam-setup** ของอาจารย์ (ใช้คอนเทนเนอร์ตัวเดียวกัน ไม่ต้องสร้างใหม่)
   ```bash
   cd final-exam-setup
   docker compose up -d
   ```
2. กลับมาที่โฟลเดอร์นี้
   ```bash
   cd ../practice-exam
   copy .env.example .env   # (Windows) หรือ cp .env.example .env — สำคัญ! ไม่งั้นจะต่อพอร์ต 3306 แทน 3309
   npm install
   npm run seed      # รีเซ็ตข้อมูล (รันใหม่ได้ทุกครั้งที่อยากเริ่มฝึกใหม่)
   npm test          # ตอนเริ่ม เทสต์ส่วนใหญ่จะ "ไม่ผ่าน" — นั่นคือโจทย์ที่ต้องแก้
   ```
3. อ่าน **TASKS.md** แล้วจับเวลา **60 นาที** เหมือนวันสอบจริง

คำสั่งรันทีละโจทย์: `npm run test:1`, `npm run test:2`, `npm run test:3`

## โครงสร้าง

```
app.js               ประกาศ route (export app ให้ Supertest)
server.js            app.listen() แยกออกมา
db.js / config.js    เหมือนชุดติดตั้งของอาจารย์
middlewares/auth.js  authenticateToken, authorizeRole
routes/menu.js       เมนูอาหาร   ← มีบั๊ก (โจทย์ 2, 3)
routes/orders.js     คำสั่งซื้อ  ← โจทย์ 1 และบั๊ก (โจทย์ 2)
tests/               เทสต์ตรวจโจทย์ 1, 2 + helpers.js (สร้าง token)
ANSWERS.md           ที่เขียนอธิบายสาเหตุบั๊ก
solution/            เฉลย — อย่าเปิดก่อนทำเสร็จ!
```

## ถ้ามีปัญหา

- `ECONNREFUSED 127.0.0.1:3309` → ยังไม่ได้ `docker compose up -d` หรือ MySQL ยังบูตไม่เสร็จ (รอ 20 วิ)
- `Jest did not exit` → ลืม `afterAll(() => pool.end())` ในไฟล์เทสต์ที่เขียนเอง
- ข้อมูลเพี้ยนหลังทดลองหลายรอบ → `npm run seed`
