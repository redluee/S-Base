import { resolvePublishUserId } from "./public-snapshot";

export interface PublishEvent {
  event: "self_evaluations_saved";
  sprintId: number;
}

export class PublishNotifier {
  notify(userId: number, payload: PublishEvent): void {
    const url = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (!url || !secret) return;

    try {
      if (resolvePublishUserId() !== userId) return;

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Secret": secret },
        body: JSON.stringify({ ...payload, at: new Date().toISOString() }),
        signal: AbortSignal.timeout(3000),
      })
        .then((res) => {
          if (!res.ok) console.warn(`Minor publish webhook responded ${res.status}`);
        })
        .catch((err) => console.warn("Minor publish webhook failed:", err?.message ?? err));
    } catch (err: any) {
      console.warn("Minor publish webhook failed:", err?.message ?? err);
    }
  }
}
