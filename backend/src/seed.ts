import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const users = [
    { name: "Admin User", email: "admin@erp.local", role: "ADMIN" as const },
    { name: "Sales User", email: "sales@erp.local", role: "SALES" as const },
    { name: "Warehouse User", email: "warehouse@erp.local", role: "WAREHOUSE" as const },
    { name: "Accounts User", email: "accounts@erp.local", role: "ACCOUNTS" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }
  console.log("Seeded 4 users (password for all: Password123!)");

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@erp.local" } });

  const customer = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Rajesh Traders",
      mobile: "9876543210",
      email: "rajesh@traders.com",
      businessName: "Rajesh Traders Pvt Ltd",
      gstNumber: "27ABCDE1234F1Z5",
      customerType: "WHOLESALE",
      address: "MG Road, Pune",
      status: "ACTIVE",
    },
  });

  const product = await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Bolt 10mm",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 5.5,
      currentStock: 500,
      minStock: 50,
      location: "Warehouse A - Rack 3",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "Steel Nut 10mm",
      sku: "SKU-002",
      category: "Hardware",
      unitPrice: 2.25,
      currentStock: 800,
      minStock: 100,
      location: "Warehouse A - Rack 4",
    },
  });

  console.log("Seeded sample customer:", customer.name);
  console.log("Seeded sample products including:", product.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
