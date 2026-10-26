import { financeAccountIcons } from "../../types/finance-icons";
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

export const financeSettings = sqliteTable("finance_settings", {
  userId: integer("user_id").primaryKey().references(() => users.userId, { onDelete: "cascade" }),
  monthlyBudgetCents: integer("monthly_budget_cents"),
}, (table) => [
  check("finance_monthly_budget", sql`${table.monthlyBudgetCents} IS NULL OR (typeof(${table.monthlyBudgetCents}) = 'integer' AND ${table.monthlyBudgetCents} >= 0 AND ${table.monthlyBudgetCents} <= 1000000000000)`),
]);

export const financeSubscriptionPreferences = sqliteTable("finance_subscription_preferences", {
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  groupKey: text("group_key").notNull(),
  cadence: text("cadence", { enum: ["weekly", "fortnightly", "fourWeekly", "monthly", "quarterly", "yearly"] }),
  irregular: integer("irregular", { mode: "boolean" }).notNull().default(false),
  name: text("name"),
  excluded: integer("excluded", { mode: "boolean" }).notNull().default(false),
  inactive: integer("inactive", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  uniqueIndex("finance_subscription_preference_source").on(table.userId, table.sourceKey),
  check("finance_subscription_irregular", sql`${table.irregular} IN (0, 1)`),
  check("finance_subscription_excluded", sql`${table.excluded} IN (0, 1)`),
  check("finance_subscription_inactive", sql`${table.inactive} IN (0, 1)`),
]);

export const financeAccounts = sqliteTable(
  "finance_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bank: text("bank"),
    icon: text("icon", { enum: financeAccountIcons }),
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

export const financeImportSources = sqliteTable(
  "finance_import_sources",
  {
    accountId: integer("account_id").primaryKey().references(() => financeAccounts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    identity: text("identity").notNull(),
    numberKey: text("number_key").notNull(),
  },
  (table) => [uniqueIndex("finance_source_identity").on(table.userId, table.identity)],
);

export const financeTransactions = sqliteTable(
  "finance_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id").notNull().references(() => financeAccounts.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    date: text("date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    counterpartyKey: text("counterparty_key"),
    transferOverride: integer("transfer_override", { mode: "boolean" }),
  },
  (table) => [
    uniqueIndex("finance_transaction_fingerprint").on(table.accountId, table.fingerprint),
    index("finance_transactions_account_date").on(table.accountId, table.date),
    check("finance_transaction_cents", sql`typeof(${table.amountCents}) = 'integer' AND abs(${table.amountCents}) <= 1000000000000`),
    check("finance_transfer_override", sql`${table.transferOverride} IS NULL OR ${table.transferOverride} IN (0,1)`),
  ],
);
