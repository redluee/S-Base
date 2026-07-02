"use client";

import { useState, useEffect } from "react";
import quotes from "./workout-quotes.json";

export function MotivationalQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const today = new Date();
    // Compute day of the year
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Choose index deterministically
    const index = (dayOfYear - 1) % quotes.length;

    // Use setTimeout to avoid synchronous setState in useEffect error
    const timer = setTimeout(() => {
      setQuote(quotes[index]);
    }, 0);
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

