import type { ReactNode } from "react";

export function EditorShell({
  header,
  left,
  canvas,
  right,
  footer,
}: {
  header: ReactNode;
  left: ReactNode;
  canvas: ReactNode;
  right: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-[640px] bg-background border rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 h-14 border-b bg-card">
        {header}
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r p-3 overflow-auto bg-muted/20">
          {left}
        </aside>
        <main className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-auto bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)]">
          <div className="w-full max-w-[960px]">{canvas}</div>
        </main>
        <aside className="w-80 shrink-0 border-l p-4 overflow-auto bg-muted/10">
          {right}
        </aside>
      </div>
      {footer}
    </div>
  );
}
