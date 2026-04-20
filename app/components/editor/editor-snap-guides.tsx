// Visual overlay that draws temporary alignment guides while the user is
// dragging a block. Purely presentational — the snapping math runs in
// editor-canvas.tsx and this component just renders the lines it emits.

export type SnapGuide = {
  axis: "x" | "y";
  pt: number; // position in PDF points
};

export function SnapGuides({
  guides,
  pxPerPtX,
  pxPerPtY,
  pageWidthPt,
  pageHeightPt,
}: {
  guides: SnapGuide[];
  pxPerPtX: number;
  pxPerPtY: number;
  pageWidthPt: number;
  pageHeightPt: number;
}) {
  if (!guides.length) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${pageWidthPt} ${pageHeightPt}`}
      preserveAspectRatio="none"
    >
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <line
            key={`x-${i}-${g.pt}`}
            x1={g.pt}
            x2={g.pt}
            y1={0}
            y2={pageHeightPt}
            stroke="#2563eb"
            strokeWidth={1 / Math.min(pxPerPtX, pxPerPtY)}
            strokeDasharray={`${4 / pxPerPtY},${4 / pxPerPtY}`}
          />
        ) : (
          <line
            key={`y-${i}-${g.pt}`}
            x1={0}
            x2={pageWidthPt}
            y1={g.pt}
            y2={g.pt}
            stroke="#2563eb"
            strokeWidth={1 / Math.min(pxPerPtX, pxPerPtY)}
            strokeDasharray={`${4 / pxPerPtX},${4 / pxPerPtX}`}
          />
        ),
      )}
    </svg>
  );
}
