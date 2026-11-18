"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyUndo, expireUndo, popUndo, pushUndo, secondsLeft, type UndoEntry, type UndoState, undoVisible } from "./undo-stack";

const TICK_MS = 200;

export interface UndoStackApi {
  visible: boolean;
  seconds: number;
  push: (entry: UndoEntry) => void;
  pop: () => UndoEntry | null;
}

export function useUndoStack(): UndoStackApi {
  const [state, setState] = useState<UndoState>(emptyUndo);
  const [now, setNow] = useState(0);
  const stateRef = useRef<UndoState>(emptyUndo);

  const commit = useCallback((next: UndoState, at: number) => {
    stateRef.current = next;
    setState(next);
    setNow(at);
  }, []);

  useEffect(() => {
    if (state.deadline === null) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      commit(expireUndo(stateRef.current, at), at);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [state.deadline, commit]);

  const push = useCallback(
    (entry: UndoEntry) => {
      const at = Date.now();
      commit(pushUndo(stateRef.current, entry, at), at);
    },
    [commit],
  );

  const pop = useCallback(() => {
    const at = Date.now();
    const { state: next, entry } = popUndo(stateRef.current, at);
    commit(next, at);
    return entry;
  }, [commit]);

  return { visible: undoVisible(state, now), seconds: secondsLeft(state, now), push, pop };
}
