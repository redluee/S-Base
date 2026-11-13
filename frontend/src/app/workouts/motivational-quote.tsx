"use client";

import { useState, useEffect } from "react";
import quotes from "@/app/workouts/workout-quotes.json";

export function quoteOfTheDay(date: Date): string {
  const dayOfYear = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000;
  return quotes[(dayOfYear - 1) % quotes.length];
}

export function MotivationalQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuote(quoteOfTheDay(new Date())), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!quote) return null;

  return (
    <section className="w-full max-w-md bg-zinc-900/30 border border-white/5 rounded-2xl p-4 sm:p-5 text-center relative z-10 shadow-inner select-none animate-in fade-in duration-500">
      <p className="text-sm font-medium italic text-zinc-400 leading-relaxed px-4">
        &ldquo;{quote}...&rdquo;
      </p>
    </section>
  );
}

