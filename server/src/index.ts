import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import "dotenv/config";
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { generateTicketNumber } from './utils/ticketNumber.js';
import { sanitizeStoredFilename } from './utils/fileSanitizer.js';
import { validateSummary, validateDescription } from './utils/validation.js';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const SESSION_COOKIE_NAME = 'toktickit_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 12;

export { app };
export default app;

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  mustChangePassword: boolean;
};

type AuthenticatedRequest = Request & { auth?: { sessionId: string; user: SafeUser } };

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} as const;

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie;
  if (!cookies) return undefined;

  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name && value.length > 0) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (origin && origin !== CLIENT_ORIGIN) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Request origin is not allowed.' },
    });
  }
  next();
}

async function requireAuthentication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = readCookie(req, SESSION_COOKIE_NAME);
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
    });
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      invalidatedAt: null,
      expiresAt: { gt: new Date() },
      user: { isActive: true },
    },
    select: { id: true, user: { select: safeUserSelect } },
  });

  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
    });
  }

  req.auth = { sessionId: session.id, user: session.user };
  next();
}

function requireRequester(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.auth?.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
    });
  }
  if (user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'A password change is required.' },
    });
  }
  if (user.role !== 'REQUESTER') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Requester access is required.' },
    });
  }
  next();
}

function requireITStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.auth?.user;
  if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
  if (user.mustChangePassword) return res.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'A password change is required.' } });
  if (user.role !== 'IT_STAFF') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'IT Staff access is required.' } });
  next();
}

function hasClientSuppliedRequesterId(req: Request): boolean {
  return Object.prototype.hasOwnProperty.call(req.query ?? {}, 'requesterId')
    || Object.prototype.hasOwnProperty.call(req.body ?? {}, 'requesterId');
}

function rejectClientSuppliedRequesterId(req: Request, res: Response): boolean {
  if (!hasClientSuppliedRequesterId(req)) return false;
  res.status(400).json({
    success: false,
    error: {
      code: 'CLIENT_IDENTITY_NOT_ALLOWED',
      message: 'Requester identity is derived from the authenticated session.',
    },
  });
  return true;
}

// ─── Authentication ─────────────────────────────────────────────────────────

app.post('/api/auth/login', requireTrustedOrigin, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { ...safeUserSelect, passwordHash: true },
    });

    if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const sessionId = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });

    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to sign in.' },
    });
  }
});

app.post('/api/auth/logout', requireTrustedOrigin, requireAuthentication, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.session.update({
      where: { id: req.auth!.sessionId },
      data: { invalidatedAt: new Date() },
    });
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    return res.status(200).json({ success: true, data: { loggedOut: true } });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to sign out.' },
    });
  }
});

app.get('/api/auth/me', requireAuthentication, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({ success: true, data: { user: req.auth!.user } });
});

app.post('/api/auth/change-password', requireTrustedOrigin, requireAuthentication, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
  if (
    typeof currentPassword !== 'string'
    || typeof newPassword !== 'string'
    || typeof confirmPassword !== 'string'
    || newPassword.length < PASSWORD_MIN_LENGTH
    || newPassword.length > 128
    || newPassword !== confirmPassword
  ) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid new password and confirmation.' },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.user.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Unable to change password with the supplied values.' },
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.auth!.user.id },
        data: { passwordHash, mustChangePassword: false },
      }),
      prisma.session.updateMany({
        where: { userId: req.auth!.user.id, id: { not: req.auth!.sessionId }, invalidatedAt: null },
        data: { invalidatedAt: now },
      }),
    ]);

    const updatedUser = { ...req.auth!.user, mustChangePassword: false };
    req.auth!.user = updatedUser;
    return res.status(200).json({ success: true, data: { user: updatedUser } });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to change password.' },
    });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'ok', service: 'TokTickIT API' });
});

// ─── GET /api/categories — active categories only ─────────────────────────────

app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.status(200).json({ success: true, data: categories });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch categories.' },
    });
  }
});

// ─── GET /api/related-systems — active related systems only ───────────────────

app.get('/api/related-systems', async (_req: Request, res: Response) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.status(200).json({ success: true, data: systems });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch related systems.' },
    });
  }
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────

app.post('/api/tickets', requireTrustedOrigin, requireAuthentication, requireRequester, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    } = req.body;
    if (rejectClientSuppliedRequesterId(req, res)) return;
    const errors: { field: string; message: string }[] = [];
    // --- Validation Rules ---
    // 1. ตรวจสอบ Category
    if (!categoryId) {
      errors.push({ field: 'categoryId', message: 'Category is required.' });
    } else {
      const category = await prisma.category.findUnique({
        where: { id: Number(categoryId), isActive: true },
      });
      if (!category) {
        errors.push({ field: 'categoryId', message: 'Active category not found.' });
      }
    }
    // 2. ตรวจสอบ Related System
    if (!relatedSystemId) {
      errors.push({ field: 'relatedSystemId', message: 'Related System is required.' });
    } else {
      const system = await prisma.relatedSystem.findUnique({
        where: { id: Number(relatedSystemId), isActive: true },
      });
      if (!system) {
        errors.push({ field: 'relatedSystemId', message: 'Active related system not found.' });
      }
    }
    // 3. ตรวจสอบ Priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      errors.push({ field: 'requestedPriority', message: 'Requested priority must be LOW, MEDIUM, or HIGH.' });
    }
    // 4. ตรวจสอบ Summary (BR-07)
    const summaryError = validateSummary(summary);
    if (summaryError) {
      errors.push(summaryError);
    }
    // 5. ตรวจสอบ Description (BR-08)
    const descriptionError = validateDescription(description);
    if (descriptionError) {
      errors.push(descriptionError);
    }
    // ถ้ามี Error แม้แต่อันเดียว ให้โยน 400 Bad Request กลับไป
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket data.',
          details: errors,
        },
      });
    }
    // Trim summary and description per BR-07 and BR-08
    const trimmedSummary = typeof summary === 'string' ? summary.trim() : summary;
    const trimmedDescription = typeof description === 'string' ? description.trim() : description;

    // --- บันทึกลง Database (พร้อม Retry ป้องกัน Concurrency Race Condition) ---
    let newTicket;
    let attempts = 0;
    while (attempts < 5) {
      try {
        const ticketNumber = await generateTicketNumber(prisma);
        newTicket = await prisma.ticket.create({
          data: {
            ticketNumber,
            requesterId: req.auth!.user.id,
            categoryId: Number(categoryId),
            relatedSystemId: Number(relatedSystemId),
            requestedPriority,
            itPriority: requestedPriority, // BR-12: เริ่มต้นให้เท่ากับ requestedPriority
            currentStatus: 'NEW',          // BR-02: เริ่มต้นที่ NEW
            summary: trimmedSummary,
            description: trimmedDescription,
          },
          include: {
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempts < 4) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    // ส่ง Response 201 Created กลับไป
    return res.status(201).json({
      success: true,
      data: newTicket,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to create ticket.' },
    });
  }
});

// ─── GET /api/tickets — My Tickets (Ownership + Search + Filter + Sort + Pagination) ───
app.get('/api/tickets', requireAuthentication, requireRequester, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      category,
      requestedPriority,
      itPriority,
      status,
      sort = 'createdAt',
      order = 'desc',
      page = '1',
      pageSize = '10',
    } = req.query;
    if (rejectClientSuppliedRequesterId(req, res)) return;

    // 2. ตรวจสอบ Pagination parameters (BR-24, BR-25)
    const pageNum = parseInt(page as string, 10);
    const sizeNum = parseInt(pageSize as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAGE', message: 'page must be a positive integer.' },
      });
    }
    if (![10, 25, 50].includes(sizeNum)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAGE_SIZE', message: 'pageSize must be 10, 25, or 50.' },
      });
    }

    // 3. ตรวจสอบ Sorting parameters
    const allowedSortFields = ['ticketNumber', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sort as string)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SORT', message: 'Invalid sort field.' },
      });
    }
    const sortOrder = (order as string).toLowerCase();
    if (!['asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ORDER', message: 'order must be asc or desc.' },
      });
    }

    // 4. ประกอบเงื่อนไข Where Query (Prisma)
    const where: any = {
      requesterId: req.auth!.user.id,
    };

    // ค้นหาข้อความ (BR-26: summary หรือ ticketNumber แบบ Case-insensitive)
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { summary: { contains: searchTerm, mode: 'insensitive' } },
        { ticketNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Filter ตาม Category
    if (category && typeof category === 'string') {
      where.category = { name: category };
    }

    // Filter ตาม Requested Priority
    if (requestedPriority && typeof requestedPriority === 'string') {
      where.requestedPriority = requestedPriority;
    }

    // Filter ตาม IT Priority
    if (itPriority && typeof itPriority === 'string') {
      where.itPriority = itPriority;
    }

    // Filter ตาม Status
    if (status && typeof status === 'string') {
      where.currentStatus = status;
    }

    // 5. ดึงข้อมูลแบบ Pagination
    const totalItems = await prisma.ticket.count({ where });
    const totalPages = Math.ceil(totalItems / sizeNum) || 1;
    const skip = (pageNum - 1) * sizeNum;

    const orderByList: Array<Record<string, string>> = [
      { [sort as string]: sortOrder },
    ];

    if (sort !== 'ticketNumber') {
      orderByList.push({ ticketNumber: 'desc' });
    }
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: orderByList,
      skip,
      take: sizeNum,
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    // 6. ตอบกลับข้อมูล
    return res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: pageNum,
          pageSize: sizeNum,
          totalItems,
          totalPages,
        },
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch tickets.' },
    });
  }
});

// ─── GET /api/staff/tickets — IT Staff Queue ────────────────────────────────
app.get('/api/staff/tickets', requireAuthentication, requireITStaff, async (req: AuthenticatedRequest, res: Response) => {
  const { search, status, requestedPriority, itPriority, ownerState, ownerId, sort = 'updatedAt', order = 'desc', page = '1', pageSize = '10' } = req.query;
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];
  const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const sortFields = ['updatedAt', 'createdAt', 'ticketNumber', 'currentStatus', 'requestedPriority', 'itPriority'];
  const pageNum = Number(page);
  const sizeNum = Number(pageSize);
  if (!Number.isInteger(pageNum) || pageNum < 1 || ![10, 25, 50].includes(sizeNum) || !sortFields.includes(String(sort)) || !['asc', 'desc'].includes(String(order).toLowerCase()) || (status && !statuses.includes(String(status))) || (requestedPriority && !priorities.includes(String(requestedPriority))) || (itPriority && !priorities.includes(String(itPriority))) || (ownerState && !['assigned', 'unassigned'].includes(String(ownerState))) || (ownerId && (!Number.isInteger(Number(ownerId)) || Number(ownerId) < 1))) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid Queue query parameters.' } });
  }
  const where: any = {};
  if (status) where.currentStatus = status;
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (itPriority) where.itPriority = itPriority;
  if (ownerState === 'assigned') where.ticketOwnerId = { not: null };
  if (ownerState === 'unassigned') where.ticketOwnerId = null;
  if (ownerId) where.ticketOwnerId = Number(ownerId);
  if (typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { ticketNumber: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { requester: { is: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] } } },
      { ticketOwner: { is: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] } } },
    ];
  }
  try {
    const [totalItems, items] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({ where, orderBy: [{ [String(sort)]: String(order).toLowerCase() }, { ticketNumber: 'desc' }], skip: (pageNum - 1) * sizeNum, take: sizeNum, include: { requester: { select: { id: true, name: true, email: true } }, ticketOwner: { select: { id: true, name: true, email: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } } }),
    ]);
    return res.status(200).json({ success: true, data: { items, pagination: { page: pageNum, pageSize: sizeNum, totalItems, totalPages: Math.ceil(totalItems / sizeNum) } } });
  } catch {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to fetch the IT Staff Queue.' } });
  }
});

// ─── Upload Configuration (BR-16, BR-17, BR-22) ──────────────────────────────
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // BR-22: Sanitized filename for disk storage
    const storedName = sanitizeStoredFilename(file.originalname);
    cb(null, storedName);
  },
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // BR-17: 5 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
      const err: any = new Error('Unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.');
      err.code = 'UNSUPPORTED_TYPE';
      return cb(err);
    }
    cb(null, true);
  },
});

// ─── GET /api/tickets/:ticketNumber — Ticket Detail (FR-06, BR-06, AC-03, AC-16) ───
app.get('/api/tickets/:ticketNumber', requireAuthentication, requireRequester, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params;
    if (rejectClientSuppliedRequesterId(req, res)) return;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: ticketNumber as string },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        ticketOwner: { select: { id: true, name: true, email: true } },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: { select: { id: true, name: true } },
            removedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    // Ownership check (BR-06, AC-03)
    if (ticket.requesterId !== req.auth!.user.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch ticket details.' },
    });
  }
});

// ─── POST /api/tickets/:ticketNumber/attachments — Upload Attachment (FR-07, BR-16, BR-17, BR-18) ───
app.post('/api/tickets/:ticketNumber/attachments', requireTrustedOrigin, requireAuthentication, requireRequester, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 5 MB limit.' },
        });
      }
      if (err.code === 'UNSUPPORTED_TYPE') {
        return res.status(415).json({
          success: false,
          error: { code: 'UNSUPPORTED_TYPE', message: err.message },
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message || 'File upload failed.' },
      });
    }
    next();
  });
}, async (req: AuthenticatedRequest, res: Response) => {
  const { ticketNumber } = req.params;
  const file = req.file;

  const cleanupFile = () => {
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }
  };

  try {
    if (rejectClientSuppliedRequesterId(req, res)) {
      cleanupFile();
      return;
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FILE', message: 'No file provided.' },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: ticketNumber as string },
    });

    if (!ticket) {
      cleanupFile();
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    // Ownership check (BR-06)
    if (ticket.requesterId !== req.auth!.user.id) {
      cleanupFile();
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
      });
    }

    // Check active attachments limit (BR-18, AC-18: max 5 active attachments)
    const activeCount = await prisma.attachment.count({
      where: {
        ticketId: ticket.id,
        removedAt: null,
      },
    });

    if (activeCount >= 5) {
      cleanupFile();
      return res.status(409).json({
        success: false,
        error: { code: 'ATTACHMENT_LIMIT', message: 'Maximum limit of 5 active attachments reached for this ticket.' },
      });
    }

    // Save attachment record to DB
    const attachment = await prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        uploaderId: req.auth!.user.id,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch {
    cleanupFile();
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to save attachment.' },
    });
  }
});

// ─── GET /api/attachments/:id/download — Download Attachment (FR-08, BR-20, AC-19, AC-21) ───
app.get('/api/attachments/:id/download', requireAuthentication, requireRequester, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (rejectClientSuppliedRequesterId(req, res)) return;

    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(id) },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Ownership check (BR-06)
    if (attachment.ticket.requesterId !== req.auth!.user.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // BR-20, AC-21: Block download of soft-removed attachments
    if (attachment.removedAt !== null) {
      return res.status(403).json({
        success: false,
        error: { code: 'REMOVED', message: 'This attachment has been removed and cannot be downloaded.' },
      });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Physical file not found on server.' },
      });
    }

    return res.download(attachment.storagePath, attachment.originalFilename);
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to download attachment.' },
    });
  }
});

// ─── DELETE /api/attachments/:id — Soft-Remove Attachment (FR-09, BR-19, BR-21, AC-20) ───
app.delete('/api/attachments/:id', requireTrustedOrigin, requireAuthentication, requireRequester, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { removalReason } = req.body;
    if (rejectClientSuppliedRequesterId(req, res)) return;

    // Validation: removalReason is required (1-500 chars) per BR-19 & API-25
    if (
      !removalReason ||
      typeof removalReason !== 'string' ||
      removalReason.trim().length < 1 ||
      removalReason.trim().length > 500
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'removalReason is required (between 1 and 500 characters).',
        },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(id) },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Ownership check (BR-06)
    if (attachment.ticket.requesterId !== req.auth!.user.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found.' },
      });
    }

    // Prevent double removal (API-26)
    if (attachment.removedAt !== null) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REMOVED', message: 'This attachment has already been removed.' },
      });
    }

    // Soft-removal (BR-19, BR-21): set removedAt, reason, and who removed it (file stays on disk)
    const updated = await prisma.attachment.update({
      where: { id: Number(id) },
      data: {
        removedAt: new Date(),
        removalReason: removalReason.trim(),
        removedByRequesterId: req.auth!.user.id,
      },
      include: {
        uploader: { select: { id: true, name: true } },
        removedBy: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to remove attachment.' },
    });
  }
});

// Start the server and wait for connections
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TokTickIT API is running on http://localhost:${PORT}`);
  });
}

