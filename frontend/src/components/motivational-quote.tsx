"use client";

import { useState, useEffect } from "react";

const quotes = [
  "De enige slechte training is degene die niet heeft plaatsgevonden.",
  "Succes begint met de beslissing om te proberen.",
  "Consistentie is de sleutel tot succes.",
  "Pijn is tijdelijk, trots is voor altijd.",
  "Je bent sterker dan je denkt.",
  "Elke stap is een stap dichter bij je doel.",
  "Vandaag doe ik wat anderen niet willen, zodat ik morgen kan doen wat anderen niet kunnen.",
  "Vergelijk jezelf alleen met wie je gisteren was.",
  "Het geheim van vooruitgang is beginnen.",
  "Geef nooit op. Grote dingen kosten tijd."
];

export function MotivationalQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  if (!quote) return null;

  return (
    <section className="w-full max-w-md bg-zinc-900/30 border border-white/5 rounded-2xl p-4 sm:p-5 text-center relative z-10 shadow-inner select-none animate-in fade-in duration-500">
      <span className="text-zinc-600 font-display text-4xl block h-4 -mt-3 mb-1 font-black leading-none">{"\u201C"}</span>
      <p className="text-sm font-medium italic text-zinc-400 leading-relaxed px-4">
        {quote}
      </p>
    </section>
  );
}
