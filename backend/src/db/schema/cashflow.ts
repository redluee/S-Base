import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const cashflowTradeNames = sqliteTable("cashflow_trade_names", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  address: text("address"),
  iban: text("iban"),
  kvkNumber: text("kvk_number"),
  vatNumber: text("vat_number"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cashflowClients = sqliteTable("cashflow_clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  email: text("email"),
  standardRate: real("standard_rate"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cashflowProjects = sqliteTable("cashflow_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => cashflowClients.id, { onDelete: "cascade" }),
  tradeNameId: integer("trade_name_id").references(() => cashflowTradeNames.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cashflowInvoices = sqliteTable("cashflow_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => cashflowClients.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => cashflowProjects.id, { onDelete: "set null" }),
  tradeNameId: integer("trade_name_id").references(() => cashflowTradeNames.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number").notNull(),
  name: text("name"),
  dateCreated: integer("date_created"),
  dateService: integer("date_service"),
  paymentDueDate: integer("payment_due_date"),
  datePaid: integer("date_paid"),
  status: text("status").notNull().default("draft"),
  isKor: integer("is_kor", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cashflowInvoiceLines = sqliteTable("cashflow_invoice_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => cashflowInvoices.id, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
  type: text("type").notNull().default("hours"),
  discountType: text("discount_type"),
  discountValue: real("discount_value"),
});
