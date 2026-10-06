# Lab 4 AI Use and Reflection

ในการทำงาน Lab 4 ครั้งนี้ ผมใช้ **OpenAI Codex** ช่วยอ่าน handout และ engineering contract แตกงานเป็น branch, ทบทวน acceptance criteria, ช่วย implement/test งานในแต่ละ branch, ตรวจและแก้ตาม peer review และรวบรวมหลักฐาน release โดยผมเป็นผู้กำหนดขอบเขตและตรวจผลก่อนนำไปใช้

> **สถานะ:** รวบรวม prompt จริงที่เลือกไว้สำหรับการตรวจของผู้ส่งแล้ว ส่วน Reflection ด้านล่างเป็นร่างจาก workflow ที่มีหลักฐาน ควรแก้ถ้อยคำให้ตรงกับประสบการณ์ของผู้ส่งก่อนส่ง PDF

## Selected Key Prompts

| # | จุดประสงค์ | Prompt ที่ใช้จริง (คัดข้อความจาก prompt) | ผลลัพธ์ / การตรวจแก้ |
|---|---|---|---|
| 1 | อ่าน handout และตั้ง engineering contract | `docs\lab-04\SE+Lab+4.md ช่วยอ่านรายละเอียดเอกสารนี้ทั้งหมด และช่วยเขียนอธิบายคร่าว ๆ ว่าผมจะต้องทำอะไรบ้าง และช่วยเขียน specification.md และไฟล์อื่น ๆ ขึ้นมาโดยคุณสามารถอ้างอิงการเขียนต่าง ๆ จาก docs\lab-03 แต่เน้นว่าไม่จำเป็นต้องเหมือนทุกอย่าง ให้อ้างอิงสิ่งที่ต้องทำจาก docs\lab-04\SE+Lab+4.md เป็นหลัก และเน้นย้ำเรื่องข้อห้ามต่าง ๆ` | จัดทำ specification, API/UI contract และ test traceability โดยยึด handout เป็นหลัก รวม explicit exclusions เช่น SLA, external notification, inventory/cost, billing/payroll, approval, BI/export และ multi-tenancy/cloud |
| 2 | วาง private Git flow | `ออกแบบตัว branch การทำงานเริ่มจากการทำ doc/ ซึ่งคือสิ่งที่คุณพึ่งทำไปจะต้องอยู่ใน branch แรก โดยทุก branch จะต้องถูก merge เข้า lab4-staging ซึ่งทุกครั่งจะมีการสร้าง PR และทำการ request @JeffMerry` | สร้างแผน issue/branch/PR ส่วนตัวในไฟล์ที่ ignore ไว้ และทำงานผ่าน PR เข้า `lab4-staging`; ไฟล์ private ไม่ถูก stage หรือ push |
| 3 | กำหนดรูปแบบ Issue และการเชื่อมโยง | `แก้ชื่อ issue ก่อน เป็น format -> Issue 1: Lab 4 — ... ตามนี แล้วก็ให้คุณเชื่อม issue กับ kanban board https://github.com/users/THN4/projects/1 ตามลิงก์นี้ และเชื่อมตัว issue กับ branch ด้วย` | ตั้งชื่อ Issue ให้เป็นรูปแบบที่กำหนดและเชื่อม branch ตามที่ตรวจยืนยันได้; บันทึกข้อจำกัดของ scope `read:project` แทนการอ้างว่าสถานะ Kanban ที่ยังตรวจไม่ได้ถูกเปลี่ยนแล้ว |
| 4 | ตรวจ plan และ artifacts เทียบกับ handout | `ช่วย recheck plan ทั้งหมดอีกทีและไฟล์ใน docs\lab-04 ทั้งหมดว่าทุกอย่างถูกต้องหมดแล้ว ตาม docs\lab-04\SE+Lab+4.md` | ทบทวนไฟล์ Lab 4 เทียบ handout, requirement, exclusions และการเชื่อม AC/test; รอบ release นี้บันทึกสถานะ pending ตามหลักฐานแทนการ mark ทุกข้อว่าผ่าน |
| 5 | รวบรวม prompt ไว้ใส่ตอนท้าย | `ช่วยลบรายละเอียดการ prompt ของตัว docs\lab-04\ai-use.md ไปก่อนไว้ใส่ทีเดียวตอนท้าย แลว้ก็คุณจะทำยังไงกับสิ่งที่ push ไปหก่อนหน้านี้` | เว้น prompt log ระหว่าง implementation แล้วรวบรวมเมื่อถึง release-evidence branch; ไม่แก้ประวัติ commit ที่ push ไปก่อนหน้านี้ |
| 6 | ทำงานทีละ branch และ commit | `ทำงานใน branch ถัดไปได้เลย โดยที่ให้ยึดทุกอย่างตาม doc ตาม docs\lab-04 ทั้งหมด โดยที่คุณต้องทำไปทีละ step และ commit` | แยก implementation/test/docs ออกเป็น commits เพื่อให้ตรวจได้; ทุก commit ยังต้องสอดคล้องกับ issue และ test status จริง |
| 7 | ตอบ peer review | `ดูที่ jeffMerry review มาแล้วแก้ไขด้วย พร้อมตอบกลับ` | ตรวจ review ใน PR จริง แปลง comment เป็นเงื่อนไขที่ทดสอบได้ แก้ไขและตอบกลับพร้อมหลักฐาน; ตัวอย่างคือ Requester attention ordering ใน PR #59 และ regression/accessibility evidence ใน PR #60 |
| 8 | ทำ release evidence โดยยังไม่ push | `ทำงานต่อใน branch นี้ ... อย่าพึ่ง push ไป ให้ผมตรวจสอบทั้งหมดก่อน ... อ้างอิง format การเขียนต่าว ๆ จาก doc ของ lab ที่ 3 docs\lab-03 ... อ้างอิงสิ่งที่ควรจะเป็น และข้อกำหนดใน docs\lab-04\specification.md และ docs\lab-04\SE+Lab+4.md` | ใช้รูปแบบหัวข้อ/ตารางจาก Lab 3 แต่รักษาข้อกำหนด Lab 4; ทำ release evidence ใน working tree และหยุดก่อน push เพื่อรอผู้ส่งตรวจ |

## My Reflection

**ร่างสำหรับผู้ส่งตรวจและปรับเป็นประสบการณ์ของตนเอง:** การใช้ specification ก่อนลงมือทำช่วยให้แบ่งงานเป็น issue ตาม dependency และกลับไปตรวจขอบเขตเมื่อ implementation หรือ review มีคำถามได้ ผมใช้ coding agent ช่วยเปลี่ยน requirement เป็น code/test แต่ยังต้องตรวจ test output, diff และสถานะจริงของ GitHub เอง โดยเฉพาะต้องแยก mocked browser tests ออกจาก real E2E และไม่บันทึกผลที่ยังรันไม่ได้ว่า Pass การ review ยังช่วยเปิดช่องว่างที่ test เดิมไม่ครอบคลุม เช่น global ordering ของ attention list การเก็บงานเป็น branch/commit ทำให้ตรวจแต่ละส่วนง่ายขึ้น อย่างไรก็ตามหลักฐาน migration บนฐานข้อมูลสำเนา, การทดสอบ final main และสถานะ Project board ยังต้องยืนยันก่อนส่งฉบับสมบูรณ์
