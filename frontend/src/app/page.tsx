import { t } from "@/lib/lang";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,227,164,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Decorative signal rings */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[32rem] rounded-full border border-brand/5 pointer-events-none" />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[24rem] rounded-full border border-brand/10 pointer-events-none"
        style={{ boxShadow: "0 0 4rem rgba(0,227,164,0.12)" }}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[16rem] rounded-full border border-brand/[0.15] pointer-events-none" />

      <header className="text-center mb-10">
        <h1 className="font-display text-[clamp(2rem,5vw+1rem,5rem)] leading-none">
          {t("Welcome to")}{" "}
          <span className="text-brand">S</span>-Base
        </h1>
      </header>
      <LoginForm />
    </main>
  );
}
