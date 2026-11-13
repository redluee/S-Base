import { serverApi } from "@/lib/server-api";
import { BodyClient } from "./client";

export default async function BodyPage() {
  return <BodyClient initialLogs={await serverApi.measurements.list()} />;
}
