import { useCallback, useEffect, useRef, useState } from "react";
import type { TemplateSnapshot } from "./use-template-history";

const KEY = (templateId: number | string) =>
  `teknokent-template-draft-${templateId}`;

type StoredDraft = {
  snapshot: TemplateSnapshot;
  savedAt: number; // epoch ms
  baselineHash: string; // hash of the server snapshot at load time
};

function hashSnapshot(s: TemplateSnapshot): string {
  return JSON.stringify(s);
}

export function useTemplateDraft(
  templateId: number | string,
  baseline: TemplateSnapshot,
) {
  const baselineHashRef = useRef(hashSnapshot(baseline));
  const [draft, setDraftState] = useState<StoredDraft | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY(templateId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredDraft;
      // Only surface the draft if it was saved against the same server
      // baseline we just loaded — otherwise the user's draft is stale.
      if (parsed.baselineHash !== baselineHashRef.current) {
        localStorage.removeItem(KEY(templateId));
        return;
      }
      setDraftState(parsed);
    } catch {
      // ignore
    }
  }, [templateId]);

  const save = useCallback(
    (snapshot: TemplateSnapshot) => {
      if (typeof window === "undefined") return;
      // Don't persist a draft that matches the baseline (no unsaved changes)
      if (hashSnapshot(snapshot) === baselineHashRef.current) {
        localStorage.removeItem(KEY(templateId));
        setDraftState(null);
        return;
      }
      try {
        const record: StoredDraft = {
          snapshot,
          savedAt: Date.now(),
          baselineHash: baselineHashRef.current,
        };
        localStorage.setItem(KEY(templateId), JSON.stringify(record));
      } catch {
        // storage full — silently skip
      }
    },
    [templateId],
  );

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY(templateId));
    setDraftState(null);
  }, [templateId]);

  const updateBaseline = useCallback((next: TemplateSnapshot) => {
    baselineHashRef.current = hashSnapshot(next);
  }, []);

  return { draft, save, clear, updateBaseline };
}
