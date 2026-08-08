import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { customerCreateSchema, customerNoteSchema, customerUpdateSchema } from "../validation/schemas";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { ApiError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

// Admin + Sales can manage customers; Warehouse/Accounts can view (read-only) for challan context
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = getPagination(req);
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status ? String(req.query.status) : undefined;

    const where: any = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { mobile: { contains: search, mode: "insensitive" } },
                { businessName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.customer.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, pageSize));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        challans: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) throw ApiError.notFound("Customer not found");
    res.json(customer);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const parsed = customerCreateSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...parsed,
        email: parsed.email || null,
        followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
      },
    });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const parsed = customerUpdateSchema.parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Customer not found");

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...parsed,
        email: parsed.email === "" ? null : parsed.email,
        followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : undefined,
      },
    });
    res.json(customer);
  })
);

router.post(
  "/:id/notes",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const { note } = customerNoteSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw ApiError.notFound("Customer not found");

    const created = await prisma.customerNote.create({
      data: { customerId: req.params.id, note, authorId: req.user!.id },
      include: { author: { select: { name: true } } },
    });
    res.status(201).json(created);
  })
);

export default router;
