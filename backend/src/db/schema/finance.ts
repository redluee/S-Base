import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const financeAccounts = sqliteTable(
  "finance_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bank: text("bank"),
    type: text("type", { enum: ["current", "savings"] }).notNull(),
    openingDate: text("opening_date").notNull(),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("finance_accounts_user").on(table.userId),
    check("finance_account_type", sql`${table.type} IN ('current', 'savings')`),
    check("finance_account_archived", sql`${table.archived} IN (0, 1)`),
  ],
);

export const financeObservations = sqliteTable(
  "finance_observations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    balanceCents: integer("balance_cents").notNull(),
  },
  (table) => [
    uniqueIndex("finance_observation_account_date").on(
      table.accountId,
      table.date,
    ),
    check(
      "finance_observation_cents",
      sql`typeof(${table.balanceCents}) = 'integer' AND abs(${table.balanceCents}) <= 1000000000000`,
    ),
  ],
);

export const financeGoals = sqliteTable(
  "finance_goals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: integer("target_cents").notNull(),
    targetDate: text("target_date"),
  },
  (table) => [
    index("finance_goals_user").on(table.userId),
    check(
      "finance_goal_target",
      sql`typeof(${table.targetCents}) = 'integer' AND ${table.targetCents} > 0 AND ${table.targetCents} <= 1000000000000`,
    ),
  ],
);

export const financeAllocations = sqliteTable(
  "finance_allocations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    goalId: integer("goal_id")
      .notNull()
      .references(() => financeGoals.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
  },
  (table) => [
    uniqueIndex("finance_allocation_goal_account").on(
      table.goalId,
      table.accountId,
    ),
    check(
      "finance_allocation_cents",
      sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} >= 0 AND ${table.amountCents} <= 1000000000000`,
    ),
  ],
);
