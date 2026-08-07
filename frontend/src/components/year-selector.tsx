"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface YearSelectorProps {
  year: number;
  onChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function YearSelector({
  year,
  onChange,
  minYear = 1900,
  maxYear = 2100,
  className = "",
}: YearSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(year));
  const [prevYear, setPrevYear] = useState(year);
  const inputRef = useRef<HTMLInputElement>(null);

  if (year !== prevYear) {
    setPrevYear(year);
    setInputValue(String(year));
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePrev = () => {
    if (year > minYear) {
      onChange(year - 1);
    }
  };

  const handleNext = () => {
    if (year < maxYear) {
      onChange(year + 1);
    }
  };

  const commitValue = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= minYear && parsed <= maxYear) {
      onChange(parsed);
    } else {
      setInputValue(String(year));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValue();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(String(year));
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 h-8 box-border ${className}`}>
      <button
        type="button"
        onClick={handlePrev}
        disabled={year <= minYear}
        className="size-6 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors cursor-pointer flex items-center justify-center"
        aria-label="Previous year"
      >
        <ChevronLeft className="size-4" />
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min={minYear}
          max={maxYear}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          className="w-14 h-6 text-center bg-zinc-800 text-white font-semibold text-sm rounded border border-blue-500/50 outline-none leading-none px-0 box-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-6 px-2 rounded text-sm font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
          title="Click to enter year manually"
        >
          {year}
        </button>
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={year >= maxYear}
        className="size-6 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors cursor-pointer flex items-center justify-center"
        aria-label="Next year"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
