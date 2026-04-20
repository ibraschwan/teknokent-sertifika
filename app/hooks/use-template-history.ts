import { useCallback, useEffect, useReducer, useRef } from "react";

export type TemplateSnapshot = {
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
};

type State = {
  past: TemplateSnapshot[];
  present: TemplateSnapshot;
  future: TemplateSnapshot[];
};

type Action =
  | { type: "SET"; payload: TemplateSnapshot; push?: boolean }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; payload: TemplateSnapshot };

const MAX_HISTORY = 50;

function sameSnapshot(a: TemplateSnapshot, b: TemplateSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET": {
      if (sameSnapshot(state.present, action.payload)) return state;
      if (action.push === false) {
        // Silent update — don't push to history (used during drag/resize).
        return { ...state, present: action.payload, future: [] };
      }
      const past = [...state.past, state.present];
      if (past.length > MAX_HISTORY) past.shift();
      return { past, present: action.payload, future: [] };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const past = state.past.slice(0, -1);
      return { past, present: previous, future: [state.present, ...state.future] };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const future = state.future.slice(1);
      return { past: [...state.past, state.present], present: next, future };
    }
    case "RESET": {
      return { past: [], present: action.payload, future: [] };
    }
  }
}

export function useTemplateHistory(initial: TemplateSnapshot) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
  });

  // Track the last committed (push=true) snapshot so drag-commit can compute
  // whether anything actually changed after the drag ended.
  const lastCommittedRef = useRef(initial);

  const set = useCallback((next: TemplateSnapshot) => {
    dispatch({ type: "SET", payload: next, push: true });
    lastCommittedRef.current = next;
  }, []);

  const setLive = useCallback((next: TemplateSnapshot) => {
    dispatch({ type: "SET", payload: next, push: false });
  }, []);

  const commitAs = useCallback((snapshot: TemplateSnapshot) => {
    if (sameSnapshot(lastCommittedRef.current, snapshot)) return;
    dispatch({ type: "SET", payload: snapshot, push: true });
    lastCommittedRef.current = snapshot;
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const reset = useCallback((snapshot: TemplateSnapshot) => {
    dispatch({ type: "RESET", payload: snapshot });
    lastCommittedRef.current = snapshot;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;

      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return {
    snapshot: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    set,
    setLive,
    commitAs,
    undo,
    redo,
    reset,
  };
}
