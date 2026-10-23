import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import {
  financeGoals as goals,
  financeAllocations as allocations,
} from "../../db/schema/finance";
import {
  ConflictError,
  ValidationError,
  requireId,
  requireObject,
} from "../../utils/validation";
import { FinanceAccountsService, FinanceNotFound } from "./accounts";
import { goalInput, cents } from "./validation";

export class FinanceGoalsService extends FinanceAccountsService {
  goal(userId: number, id: number) {
    const goal = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, requireId(id)), eq(goals.userId, userId)))
      .get();
    if (!goal) throw new FinanceNotFound("Goal not found");
    return goal;
  }
  createGoal(userId: number, input: unknown) {
    const data = goalInput(input);
    if (
      db.select().from(goals).where(eq(goals.userId, userId)).all().length >=
      200
    )
      throw new ValidationError("Goal limit reached");
    return db
      .insert(goals)
      .values({ userId, ...data })
      .returning()
      .get();
  }
  updateGoal(userId: number, id: number, input: unknown) {
    const data = goalInput(input);
    return db.transaction((tx) => {
      this.goal(userId, id);
      const total = tx
        .select()
        .from(allocations)
        .where(eq(allocations.goalId, id))
        .all()
        .reduce((sum, a) => sum + a.amountCents, 0);
      if (total > data.targetCents)
        throw new ConflictError("Target is below allocated amount");
      return tx
        .update(goals)
        .set(data)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)))
        .returning()
        .get();
    });
  }
  deleteGoal(userId: number, id: number) {
    this.goal(userId, id);
    db.delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .run();
    return { success: true };
  }
  allocate(userId: number, id: number, accountId: number, input: unknown) {
    const amountCents = cents(requireObject(input).amountCents, 0);
    return db.transaction((tx) => {
      const goal = this.goal(userId, id),
        account = this.account(userId, accountId);
      if (account.type !== "savings")
        throw new ValidationError("Only savings accounts can be allocated");
      const accountAllocations = tx
        .select()
        .from(allocations)
        .where(eq(allocations.accountId, accountId))
        .all();
      const previous =
        accountAllocations.find((a) => a.goalId === id)?.amountCents ?? 0;
      const accountTotal =
        accountAllocations.reduce((sum, a) => sum + a.amountCents, 0) -
        previous +
        amountCents;
      const goalTotal =
        tx
          .select()
          .from(allocations)
          .where(eq(allocations.goalId, id))
          .all()
          .reduce((sum, a) => sum + a.amountCents, 0) -
        previous +
        amountCents;
      const balance = this.history(userId, accountId).at(-1)?.balanceCents;
      if (
        amountCents > previous &&
        (account.archived ||
          balance === undefined ||
          accountTotal > Math.max(0, balance))
      )
        throw new ConflictError(
          "Allocation exceeds available savings or account is archived",
        );
      if (goalTotal > goal.targetCents)
        throw new ConflictError("Allocation exceeds goal target");
      if (amountCents === 0) {
        tx.delete(allocations)
          .where(
            and(
              eq(allocations.goalId, id),
              eq(allocations.accountId, accountId),
            ),
          )
          .run();
      } else {
        tx.insert(allocations)
          .values({ goalId: id, accountId, amountCents })
          .onConflictDoUpdate({
            target: [allocations.goalId, allocations.accountId],
            set: { amountCents },
          })
          .run();
      }
      return { success: true };
    });
  }
}
