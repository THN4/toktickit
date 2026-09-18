# Lab 3 AI Use and Reflection

ในการทำงาน Lab 3 ครั้งนี้ ผมใช้ **OpenAI Codex** เป็นผู้ช่วยด้านการวิเคราะห์ความต้องการ อธิบายแนวคิด ออกแบบแนวทาง implement เขียนโค้ด สร้าง test ตรวจสอบผลลัพธ์ และติดตาม review จาก Pull Request โดยผมเป็นผู้ตรวจสอบผลลัพธ์และตัดสินใจขั้นสุดท้ายเอง

---

## Selected Key Prompts

| # | จุดประสงค์ | Prompt ที่ใช้จริง | Reflection |
|---|---|---|---|
| 1 | ทำความเข้าใจการแตกงานจาก specification | `ช่วยอ่าน Lab 3 specification และอธิบายว่าควรแบ่งงานเป็น Issues อย่างไร โดยช่วยแยก dependency ระหว่าง authentication, authorization, ticket workflow, user management และ quality evidence พร้อมเสนอ branch/PR ที่เหมาะสม` | ผมเข้าใจว่าการแบ่ง Issue ควรแบ่งตามความรับผิดชอบและ dependency ไม่ใช่แบ่งตามไฟล์อย่างเดียว ทำให้ทำงานและตรวจสอบแต่ละ PR ได้ง่ายขึ้น |
| 2 | เข้าใจ seed password และ authentication | `LAB3_INITIAL_PASSWORD มีหน้าที่อะไรในระบบ seed และต่างจาก password ที่ผู้ใช้เลือกเองอย่างไร ช่วยอธิบายความเสี่ยง แล้วช่วย implement flow ที่บังคับให้ผู้ใช้เปลี่ยน password ครั้งแรก พร้อม test ที่เหมาะสม` | ผมเข้าใจว่า initial password เป็น credential สำหรับ local seed ต้องเก็บผ่าน environment และใช้ร่วมกับ `mustChangePassword` โดยไม่เก็บ plain text ในฐานข้อมูล |
| 3 | วิเคราะห์ role และ authorization | `จาก specification และ authorization matrix ช่วยวิเคราะห์ว่า REQUESTER, IT_STAFF และ ADMINISTRATOR ควรเข้าถึง route/API ใดบ้าง และ seed ควรมี active/inactive user แบบใด จากนั้นช่วย implement route guard และ API authorization tests โดยแยก Forbidden กับ Unauthenticated` | การถามเหตุผลก่อน implement ช่วยให้ผมไม่กำหนด `isActive` แบบเหมารวมทุก role และเข้าใจความแตกต่างระหว่าง role กับสถานะบัญชี |
| 4 | ออกแบบ Ticket workflow และ seed | `ช่วยอธิบายความแตกต่างระหว่าง ticket owner, IT priority, formal status, requesterResolvedAt, Public Comment และ Internal Note แล้วช่วยออกแบบ migration, seed ticket assigned/unassigned และ test ownership/status transition` | ผมเข้าใจว่าข้อมูลแต่ละช่องมีหน้าที่ต่างกัน และไม่ควรใช้ status แทน requester resolution การมี seed ที่ realistic ช่วยให้ทดสอบ Queue และ Ticket Detail ได้จริง |
| 5 | เรียนรู้การอ่าน PR review | `ช่วยอ่าน review ใน PR นี้ แล้วอธิบายว่าข้อเสนอแนะเกี่ยวข้องกับ acceptance criteria หรือ business rule ข้อใด จากนั้นเสนอทางเลือกแก้ไขที่มีผลกระทบน้อยที่สุด พร้อมเพิ่ม test พิสูจน์ว่าปัญหาถูกแก้แล้ว` | ผมได้เรียนรู้ว่าควรแปลง review comment เป็น requirement ที่ตรวจสอบได้ ไม่ใช่แก้ตามข้อความทันที เช่น Queue pagination, mobile card และ field-level validation |
| 6 | ตรวจ visual evidence | `ช่วยเทียบ ui-spec.md และ Lab_3_sheet.md กับ artifacts/lab-03/screenshots แล้วทำตารางว่าหน้าจอและ state ครบหรือไม่ ถ้าไม่ครบช่วยออกแบบ Playwright test ตาม viewport และ path ที่กำหนด` | การทำ traceability ทำให้พบว่าหลักฐานแรกมีเฉพาะ User Management จึงเพิ่มภาพ Authentication, Queue, Ticket Detail และ state ที่สำคัญ |
| 7 | แยก mocked UI กับ Real E2E | `ช่วยอธิบายว่า Playwright ที่ใช้ page.route() ต่างจาก Real E2E อย่างไรในเรื่อง server, cookie, authorization middleware และ PostgreSQL แล้วช่วยตรวจ tests.md ว่าตั้งชื่อหรือสถานะผิดหรือไม่` | ผมเข้าใจว่าการเปิด browser ไม่ได้แปลว่าเป็น E2E เสมอไป ถ้า API ถูก mock ต้องเรียกว่า browser UI integration และระบุข้อจำกัดให้ตรงหลักฐาน |
| 8 | Implement Real E2E | `ช่วยออกแบบและ implement Real E2E สำหรับ authentication, IT Staff Queue/Ticket Detail และ Administrator User Management โดยต้องใช้ Vite client, Express server, session cookie และ PostgreSQL seed จริง ห้ามใช้ page.route() แล้วอธิบายว่าแต่ละ flow พิสูจน์ acceptance criteria ใด` | ผมเห็นความแตกต่างระหว่าง test ที่ผ่านด้วย mock กับ test ที่ตรวจตั้งแต่ browser ถึง database จริง จึงเปลี่ยน E2E status เป็น Pass ได้อย่างมีหลักฐาน |

---

## My Reflection

การใช้ AI ใน Lab 3 ไม่ได้จำกัดอยู่ที่การสั่งให้สร้างโค้ด ผมใช้ AI เพื่อถามแนวคิดก่อนตัดสินใจ เช่น authorization matrix, password lifecycle, transaction safety, responsive behavior และประเภทของ automated test เมื่อเข้าใจเหตุผลแล้วจึงค่อยให้ช่วย implement และเขียน test ตามขอบเขตที่กำหนด

สิ่งที่เรียนรู้มากที่สุดคือผลลัพธ์จาก AI ต้องตรวจสอบกับ specification, โค้ดจริง, test output และ review จากเพื่อนเสมอ ตัวอย่างคือ screenshot ชุดแรกดูเหมือนใช้งานได้ แต่เมื่อเทียบเอกสารกลับพบว่าขาดหลายหน้าจอ และ Playwright ที่ mock API ก็ไม่ควรถูกเรียกว่า Real E2E

ผมได้เรียนรู้การทำ traceability โดยเชื่อม acceptance criteria กับ API test, UI test, visual evidence และ Real E2E การให้ AI อธิบายข้อดีข้อเสียก่อนแก้ไขช่วยให้ตัดสินใจดีขึ้น แต่ผมยังรับผิดชอบการเลือกแนวทาง ตรวจผล และยืนยันว่าโค้ดอยู่ใน scope ของ Lab 3

> [!NOTE]
> เอกสารนี้บันทึกการใช้ AI ตามการทำงานจริงของผม AI ช่วยวิเคราะห์ อธิบาย implement รัน test และจัดรูปแบบ Markdown ส่วนการตัดสินใจ ตรวจสอบผลลัพธ์ และความรับผิดชอบต่อผลงานเป็นของผม
