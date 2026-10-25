import { eq } from "drizzle-orm";
import db from "../../db/client";
import { financeSubscriptionPreferences as preferences } from "../../db/schema/finance";
import type { FinanceSubscription, FinanceSubscriptions, FinanceTransactionPage } from "../../types/finance";
import { requireObject, ValidationError } from "../../utils/validation";
import { FinanceNotFound } from "./accounts";
import { FinanceImportService } from "./import";
import { detectSubscriptions, subscriptionSourceKey } from "./subscriptions";
import { text, today } from "./validation";

export class FinanceSubscriptionService extends FinanceImportService {
  subscriptions(userId: number): FinanceSubscriptions {
    const end = today();
    const report = detectSubscriptions(this.periodTransactions(userId, "1900-01-01", end), end);
    const rules = db.select().from(preferences).where(eq(preferences.userId, userId)).all();
    const bySource = new Map(rules.map((rule) => [rule.sourceKey, rule]));
    const groups = new Map<string, FinanceSubscription[]>();
    for (const entry of report.entries) {
      const rule = bySource.get(entry.id);
      if (rule?.excluded) continue;
      const key = rule?.groupKey ?? entry.id;
      const group = groups.get(key) ?? [];
      group.push({ ...entry, name: rule?.name ?? entry.name });
      groups.set(key, group);
    }
    const entries = [...groups].map(([id, group]) => {
      group.sort((a, b) => a.lastDate.localeCompare(b.lastDate) || a.id.localeCompare(b.id));
      const latest = group[group.length - 1];
      return {
        ...latest,
        id,
        sourceKeys: group.flatMap((entry) => entry.sourceKeys),
        accountIds: [...new Set(group.flatMap((entry) => entry.accountIds))],
        totalCents: group.reduce((sum, entry) => sum + entry.totalCents, 0),
        paymentCount: group.reduce((sum, entry) => sum + entry.paymentCount, 0),
        firstDate: group.map((entry) => entry.firstDate).sort()[0],
      };
    });
    entries.sort((a, b) => Number(b.active) - Number(a.active) || b.monthlyCents - a.monthlyCents || a.name.localeCompare(b.name));
    return {
      ...report,
      entries,
      monthlyCents: entries.filter((entry) => entry.active).reduce((sum, entry) => sum + entry.monthlyCents, 0),
      totalCents: entries.reduce((sum, entry) => sum + entry.totalCents, 0),
    };
  }
  subscriptionTransactions(userId: number, id: unknown, input: Record<string, unknown> = {}): FinanceTransactionPage {
    const subscription = this.subscription(userId, id);
    const page = Number(input.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new ValidationError("finance.transactions.invalidFilter");
    const sources = new Set(subscription.sourceKeys);
    const entries = this.periodTransactions(userId, "1900-01-01", today())
      .filter((entry) => entry.amountCents < 0 && !entry.internalTransfer && sources.has(subscriptionSourceKey(entry)));
    return { entries: entries.slice((page - 1) * 50, page * 50), total: entries.length, page, pageSize: 50 };
  }
  private subscription(userId: number, id: unknown) {
    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id))
      throw new ValidationError("finance.subscriptions.invalidSelection");
    const entry = this.subscriptions(userId).entries.find((entry) => entry.id === id);
    if (!entry) throw new FinanceNotFound("Subscription not found");
    return entry;
  }
  private saveSubscription(userId: number, entries: FinanceSubscription[], groupKey: string, name: string, excluded: boolean) {
    const groupKeys = new Set(entries.map((entry) => entry.id));
    const existing = db.select().from(preferences).where(eq(preferences.userId, userId)).all()
      .filter((rule) => groupKeys.has(rule.groupKey));
    const sourceKeys = new Set([...entries.flatMap((entry) => entry.sourceKeys), ...existing.map((rule) => rule.sourceKey)]);
    for (const sourceKey of sourceKeys) {
      db.insert(preferences).values({ userId, sourceKey, groupKey, name, excluded })
        .onConflictDoUpdate({ target: [preferences.userId, preferences.sourceKey], set: { groupKey, name, excluded } }).run();
    }
    return { success: true };
  }
  renameSubscription(userId: number, input: unknown) {
    const body = requireObject(input);
    const name = text(body.name)!;
    return db.transaction(() => {
      const entry = this.subscription(userId, body.id);
      return this.saveSubscription(userId, [entry], entry.id, name, false);
    });
  }
  mergeSubscriptions(userId: number, input: unknown) {
    const body = requireObject(input);
    return db.transaction(() => {
      const entry = this.subscription(userId, body.id);
      const target = this.subscription(userId, body.targetId);
      if (entry.id === target.id) throw new ValidationError("finance.subscriptions.invalidSelection");
      return this.saveSubscription(userId, [entry, target], target.id, target.name, false);
    });
  }
  excludeSubscription(userId: number, input: unknown) {
    const body = requireObject(input);
    return db.transaction(() => {
      const entry = this.subscription(userId, body.id);
      return this.saveSubscription(userId, [entry], entry.id, entry.name, true);
    });
  }
}
