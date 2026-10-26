import { redirect } from "next/navigation";

export default function SubscriptionsPage() {
  redirect("/finance?tab=subscriptions");
}
