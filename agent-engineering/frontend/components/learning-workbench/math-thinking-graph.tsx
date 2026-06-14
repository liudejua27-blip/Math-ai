import type { MathThinkingGraphSpec } from "@/lib/ai/math-diagnosis-types";

type MathThinkingGraphProps = {
  graph: MathThinkingGraphSpec;
};

const COLUMN_BY_KIND: Record<
  MathThinkingGraphSpec["nodes"][number]["kind"],
  number
> = {
  problem: 0,
  step: 1,
  check: 2,
  evidence: 2,
  atom: 3,
  variant: 4,
};

const STATUS_STYLE = {
  pass: {
    fill: "hsl(151 55% 96%)",
    stroke: "hsl(151 45% 45%)",
    text: "hsl(151 55% 24%)",
  },
  fail: {
    fill: "hsl(0 80% 97%)",
    stroke: "hsl(0 72% 55%)",
    text: "hsl(0 64% 30%)",
  },
  warn: {
    fill: "hsl(42 100% 96%)",
    stroke: "hsl(38 92% 52%)",
    text: "hsl(33 72% 26%)",
  },
  neutral: {
    fill: "hsl(210 30% 98%)",
    stroke: "hsl(214 25% 65%)",
    text: "hsl(215 25% 25%)",
  },
} as const;

const EDGE_STYLE = {
  supports: "hsl(214 25% 48%)",
  fails: "hsl(0 72% 55%)",
  causes: "hsl(33 92% 50%)",
  trains: "hsl(199 86% 45%)",
} as const;

export function MathThinkingGraph({ graph }: MathThinkingGraphProps) {
  const layout = buildLayout(graph);

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-background">
      <div className="border-border/70 border-b px-3 py-2 font-medium text-sm">
        {graph.title}
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label={graph.title}
          className="min-w-[760px] text-xs"
          role="img"
          viewBox={`0 0 960 ${layout.height}`}
        >
          <defs>
            <marker
              id="math-thinking-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>
          {graph.edges.map((edge, index) => {
            const from = layout.positions.get(edge.from);
            const to = layout.positions.get(edge.to);
            if (!(from && to)) {
              return null;
            }
            const color = EDGE_STYLE[edge.kind ?? "supports"];
            const startX = from.x + 152;
            const startY = from.y + 30;
            const endX = to.x - 10;
            const endY = to.y + 30;
            const curve = Math.max(40, (endX - startX) / 2);

            return (
              <g className="text-muted-foreground" key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${
                    endX - curve
                  } ${endY}, ${endX} ${endY}`}
                  fill="none"
                  markerEnd="url(#math-thinking-arrow)"
                  stroke={color}
                  strokeLinecap="round"
                  strokeWidth="2"
                />
                {edge.label && (
                  <text
                    fill={color}
                    fontSize="11"
                    textAnchor="middle"
                    x={(startX + endX) / 2}
                    y={(startY + endY) / 2 - 8}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
          {graph.nodes.map((node) => {
            const position = layout.positions.get(node.id);
            if (!position) {
              return null;
            }
            const style = STATUS_STYLE[node.status ?? "neutral"];
            const lines = wrapSvgText(node.label, 10).slice(0, 2);

            return (
              <g key={node.id}>
                <title>{node.description || node.label}</title>
                <rect
                  fill={style.fill}
                  height="60"
                  rx="8"
                  stroke={style.stroke}
                  strokeWidth="1.5"
                  width="152"
                  x={position.x}
                  y={position.y}
                />
                <text
                  fill={style.text}
                  fontSize="12"
                  fontWeight="600"
                  textAnchor="middle"
                  x={position.x + 76}
                  y={position.y + (lines.length === 1 ? 34 : 27)}
                >
                  {lines.map((line, index) => (
                    <tspan
                      dy={index === 0 ? 0 : 15}
                      key={`${node.id}-${line}-${index}`}
                      x={position.x + 76}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function buildLayout(graph: MathThinkingGraphSpec) {
  const xByColumn = [24, 206, 388, 570, 752];
  const counts = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();

  for (const node of graph.nodes) {
    const column = COLUMN_BY_KIND[node.kind] ?? 0;
    const row = counts.get(column) ?? 0;
    counts.set(column, row + 1);
    positions.set(node.id, {
      x: xByColumn[column],
      y: 24 + row * 86,
    });
  }

  const maxRows = Math.max(1, ...counts.values());
  return {
    height: Math.max(170, 48 + maxRows * 86),
    positions,
  };
}

function wrapSvgText(text: string, maxChars: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) {
    return [clean];
  }
  const lines: string[] = [];
  for (let index = 0; index < clean.length; index += maxChars) {
    lines.push(clean.slice(index, index + maxChars));
  }
  return lines;
}
