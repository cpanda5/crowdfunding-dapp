import { Empty } from "antd";

function FundingChart({ points }) {
  if (!points || points.length === 0) {
    return <Empty description="暂无投资数据" />;
  }

  const W = 640;
  const H = 240;
  const pad = { top: 20, right: 48, bottom: 28, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xs = points.map((_, i) => i);
  const maxX = Math.max(1, xs.length - 1);
  const maxRaised = Math.max(...points.map((p) => p.raised), 0.0001);
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  const x = (i) => pad.left + (i / maxX) * innerW;
  const yRaised = (v) => pad.top + innerH - (v / maxRaised) * innerH;
  const yCount = (v) => pad.top + innerH - (v / maxCount) * innerH;

  const line = (mapY, key) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${mapY(p[key])}`).join(" ");

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="众筹数据看板">
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#dde5e1" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#dde5e1" />

      <path d={line(yRaised, "raised")} fill="none" stroke="#176b5b" strokeWidth="2.5" />
      {points.map((p, i) => (
        <circle key={`r${i}`} cx={x(i)} cy={yRaised(p.raised)} r="3" fill="#176b5b" />
      ))}

      <path d={line(yCount, "count")} fill="none" stroke="#d48806" strokeWidth="2" strokeDasharray="5 4" />
      {points.map((p, i) => (
        <circle key={`c${i}`} cx={x(i)} cy={yCount(p.count)} r="2.5" fill="#d48806" />
      ))}

      <g fontSize="11" fontFamily="sans-serif">
        <rect x={pad.left} y={4} width="12" height="3" fill="#176b5b" />
        <text x={pad.left + 16} y={9} fill="#17211f">已筹 (ETH)</text>
        <rect x={pad.left + 110} y={4} width="12" height="3" fill="#d48806" />
        <text x={pad.left + 126} y={9} fill="#17211f">参与人数</text>
        <text x={pad.left - 6} y={pad.top + 4} textAnchor="end" fill="#176b5b">
          {maxRaised.toFixed(2)}
        </text>
        <text x={pad.left + innerW + 6} y={pad.top + 4} fill="#d48806">
          {maxCount}
        </text>
      </g>
    </svg>
  );
}

export default FundingChart;
