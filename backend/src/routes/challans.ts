import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { challanCreateSchema } from "../validation/schemas";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { ApiError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

async function generateChallanNumber(tx: any) {
  const year = new Date().getFullYear();
  const count = await tx.challan.count();
  return `CH-${year}-${String(count + 1).padStart(5, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = getPagination(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const customerId = req.query.customerId ? String(req.query.customerId) : undefined;

    const where: any = {
      AND: [status ? { status } : {}, customerId ? { customerId } : {}],
    };

    const [data, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true, businessName: true } } },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, pageSize));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true } },
      },
    });
    if (!challan) throw ApiError.notFound("Challan not found");
    res.json(challan);
  })
);

// Create as DRAFT. Draft challans never touch stock.
router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const parsed = challanCreateSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: parsed.customerId } });
    if (!customer) throw ApiError.badRequest("Customer not found");

    const productIds = parsed.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      throw ApiError.badRequest("One or more products not found");
    }
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const result = await prisma.$transaction(async (tx: any) => {
      const challanNumber = await generateChallanNumber(tx);

      let totalQuantity = 0;
      const itemsData = parsed.items.map((item) => {
        const product = productMap.get(item.productId)!;
        totalQuantity += item.quantity;
        return {
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          priceSnapshot: product.unitPrice,
          quantity: item.quantity,
          lineTotal: Number(product.unitPrice) * item.quantity,
        };
      });

      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: parsed.customerId,
          status: "DRAFT",
          totalQuantity,
          createdById: req.user!.id,
          items: { create: itemsData },
        },
        include: { items: true, customer: true },
      });

      return challan;
    });

    res.status(201).json(result);
  })
);

// Confirming a challan: validates stock availability, then atomically reduces stock
// and logs an OUT movement per line item. Stock can never go negative.
router.post(
  "/:id/confirm",
  requireRole("ADMIN", "SALES", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const challanId = req.params.id;

    const result = await prisma.$transaction(async (tx: any) => {
      const challan = await tx.challan.findUnique({ where: { id: challanId }, include: { items: true } });
      if (!challan) throw ApiError.notFound("Challan not found");
      if (challan.status !== "DRAFT") {
        throw ApiError.conflict(`Only DRAFT challans can be confirmed (current status: ${challan.status})`);
      }

      // Re-check current live stock for every line item before committing
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw ApiError.badRequest(`Product ${item.skuSnapshot} no longer exists`);
        if (product.currentStock < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for ${product.name} (${product.sku}): requested ${item.quantity}, available ${product.currentStock}`,
            { productId: product.id, requested: item.quantity, available: product.currentStock }
          );
        }
      }

      // All checks passed — apply stock reductions + movement log entries
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "OUT",
            reason: `Challan ${challan.challanNumber} confirmed`,
            createdById: req.user!.id,
            challanId: challan.id,
          },
        });
      }

      const updated = await tx.challan.update({
        where: { id: challanId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include: { items: true, customer: true },
      });

      return updated;
    });

    res.json(result);
  })
);

// Cancelling a CONFIRMED challan restores the stock that was deducted.
router.post(
  "/:id/cancel",
  requireRole("ADMIN", "SALES", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const challanId = req.params.id;

    const result = await prisma.$transaction(async (tx: any) => {
      const challan = await tx.challan.findUnique({ where: { id: challanId }, include: { items: true } });
      if (!challan) throw ApiError.notFound("Challan not found");

      if (challan.status === "CANCELLED") {
        throw ApiError.conflict("Challan is already cancelled");
      }

      // Only CONFIRMED challans have affected stock; DRAFT challans can simply be marked cancelled
      if (challan.status === "CONFIRMED") {
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: "IN",
              reason: `Challan ${challan.challanNumber} cancelled — stock restored`,
              createdById: req.user!.id,
              challanId: challan.id,
            },
          });
        }
      }

      const updated = await tx.challan.update({
        where: { id: challanId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
        include: { items: true, customer: true },
      });

      return updated;
    });

    res.json(result);
  })
);

export default router;
