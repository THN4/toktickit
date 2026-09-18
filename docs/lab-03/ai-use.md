# Lab 3 AI Use and Reflection

During Lab 3, I used **OpenAI Codex** as a coding assistant for analysis, implementation, testing, documentation, and Pull Request review follow-up. I used the agent to inspect the repository and specifications, propose scoped changes, run tests, and explain the trade-offs. I reviewed the work, made decisions about scope, and verified the resulting behavior with tests and PR feedback.

---

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|---|
| 1 | Lab 3 planning and engineering contract | `ใช้ GitHub CLI สร้าง Lab 3 Issues 7 รายการตามแผน branch ใน docs/lab-03/LAB3_WORKFLOW_PRIVATE.md` | AI helped turn the written scope into small Issues and branches. This made the implementation order and PR boundaries easier to follow. |
| 2 | Authentication and initial password | `อยากรู้ว่าตัว LAB3_INITIAL_PASSWORD เอาไว้ทำอะไร` | AI explained that the value is only a local seed credential, not a password stored in source code. I learned why it must be kept in environment configuration and why first login requires a password change. |
| 3 | Role and authorization review | `ใน lab ได้กำหนดมั้ยว่า แต่ละ role ต้องมี isActive เป็น false` | AI compared the question with the specification and seed behavior. This helped identify the required active/inactive fixture mix instead of applying the same state to every role. |
| 4 | Staff Ticket workflow | `อยากรู้ว่าในขั้นที่ผมต้องสร้าง seed ตัว ticket ในเวอร์ชันที่มี IT รับผิดชอบงาน อยู่ในขั้นตอนไหน` | AI located the seed requirement within the workflow work and connected it to Queue, owner, priority, status, comments, and notes. This showed how realistic seed data supports both UI work and tests. |
| 5 | PR review follow-up | `ช่วยเช็กรีวิว และสรุปว่าต้องแก้ไข หรือมีสิ้งไหนที่เราทำถูำ` | AI translated review comments into concrete actions. Examples included responsive cards, field-level validation, API error fields, Queue pagination, and authorization regression tests. I still checked that each change stayed within the written Lab 3 scope. |
| 6 | Visual evidence audit | `ช่วยเช็กอีกทีว่าการเช็กทุกอย่างมันครบมั้ย ดูจาก docs/lab-03/Lab_3_sheet.md และ docs/lab-03/specification.md และ docs/lab-03/tests.md` | AI identified that the first screenshot set covered only User Management. This led to repeatable screenshots for Authentication, Queue, Ticket Detail, and User Management at required viewports and states. |
| 7 | Accurate test classification | `ช่วยอ่านคอมเม้น แล้วแก้ไข` | AI helped apply reviewer feedback that mocked Playwright browser flows are not real E2E. I learned to distinguish UI integration tests using `page.route()` from tests that use the actual server, cookies, and database. |
| 8 | Real E2E coverage | `งั้นช่วยทำได้เลยในส่วนการ test` | AI created and ran dedicated Playwright flows against the real client, Express server, session cookie, and PostgreSQL seed data for authentication, IT Staff Queue/Ticket Detail, and Administrator User Management. This made it possible to change the E2E test status based on real execution rather than mocked evidence. |

---

## Overall Reflection

Lab 3 extended the project from the Requester workflow into a role-based Ticketing system. The work included authentication, authorization, database migration, IT Staff operations, Administrator User Management, responsive UI, and quality evidence. Using AI was useful because it could rapidly connect a review comment to the relevant specification, source file, test file, and PR history.

The most important lesson was that AI-generated implementation and labels still need careful verification. In particular, a browser test can look like end-to-end coverage while still mocking the API. The reviewer feedback and the later Real E2E work made this difference clear. I learned to require evidence from the actual browser, server, session cookie, and PostgreSQL database before describing a test as real E2E.

I used Codex both for interactive explanation and for scoped coding assistance. I reviewed the code changes, test output, screenshots, and GitHub review discussion before accepting results. The specifications and test traceability documents were important constraints: they kept AI work aligned with the Lab 3 requirements rather than adding unrelated functionality.

> [!NOTE]
> This document records my actual use of AI during Lab 3. AI assisted with analysis, implementation, test execution, and Markdown formatting; the project decisions, review of results, and final responsibility remain mine.
