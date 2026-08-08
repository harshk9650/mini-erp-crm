import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { productCreateSchema, productUpdateSchema, stockMovementSchema } from "../validation/schemas";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { ApiError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = getPagination(req);
    const search = String(req.query.search ?? "").trim();
    const lowStock = req.query.lowStock === "true";

    const where: any = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    let data = await prisma.product.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
    let total = await prisma.product.count({ where });

    if (lowStock) {
      // Prisma can't compare two columns directly; filter in app layer for this small dataset use-case
      const all = await prisma.product.findMany({ where });
      const filtered = all.filter((p) => p.currentStock <= p.minStock);
      total = filtered.length;
      data = filtered.slice(skip, skip + take);
    }

    res.json(paginatedResponse(data, total, page, pageSize));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw ApiError.notFound("Product not found");
    res.json(product);
  })
);

router.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = getPagination(req);
    const where = { productId: req.params.id };
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, pageSize));
  })
);

router.post(
  "/",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const parsed = productCreateSchema.parse(req.body);
    const product = await prisma.product.create({ data: parsed });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const parsed = productUpdateSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Product not found");

    // currentStock is intentionally NOT editable here directly; it only changes via
    // stock movements or challan confirmation, to keep the movement log the source of truth.
    const { currentStock, ...rest } = parsed;
    const product = await prisma.product.update({ where: { id: req.params.id }, data: rest });
    res.json(product);
  })
);

// Manual stock movement (e.g. warehouse correction, new stock intake)
router.post(
  "/:id/movements",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const parsed = stockMovementSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      const product = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!product) throw ApiError.notFound("Product not found");

      const delta = parsed.movementType === "IN" ? parsed.quantity : -parsed.quantity;
      const newStock = product.currentStock + delta;

      if (newStock < 0) {
        throw ApiError.badRequest(
          `Cannot remove ${parsed.quantity} units — only ${product.currentStock} in stock`,
          { available: product.currentStock, requested: parsed.quantity }
        );
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: parsed.quantity,
          movementType: parsed.movementType,
          reason: parsed.reason,
          createdById: req.user!.id,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      return { movement, product: updatedProduct };
    });

    res.status(201).json(result);
  })
);

export default router;
