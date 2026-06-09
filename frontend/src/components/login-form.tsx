"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.login(username, password);
      router.push("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not_found") setError(t("User not found"));
      else if (msg === "wrong_password") setError(t("Wrong password"));
      else setError(t("Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder={t("Username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="h-10"
          />
          <Input
            type="password"
            placeholder={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-brand text-zinc-900 hover:bg-brand-hover font-medium"
          >
            {loading ? t("Logging in...") : t("Login")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
