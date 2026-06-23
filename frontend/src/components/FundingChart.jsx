import { Empty } from "antd";
import { useState } from "react";

function FundingChart({ points }) {
  const [hover, setHover] = useState(null);

  if (!points || points.length === 0) {
    return <Empty description="暂无投资数据" />;
  }

  const W = 640;
  const H = 272;
  const pad = { top: 24, right: 64, bottom: 42, left: 64 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const maxX = Math.max(1, points.length - 1);
  const maxRaised = Math.max(...points.map((p) => p.raised), 0.0001);
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  const x = (i) => pad.left + (i / maxX) * innerW;
  const yRaised = (v) => pad.top + innerH - (v / maxRaised) * innerH;
  const yCount = (v) => pad.top + innerH - (v / maxCount) * innerH;

  const line = (mapY, key) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${mapY(p[key])}`).join(" ");

  const fmtEth = (v) => (maxRaised < 10 ? v.toFixed(1) : v.toFixed(0));
  const div = 4;
  const leftTicks = Array.from({ length: div + 1 }, (_, k) => (maxRaised * k) / div);
  const countStep = Math.max(1, Math.ceil(maxCount / div));
  const rightTicks = [];
  for (let v = 0; v <= maxCount; v += countStep) rightTicks.push(v);
  const xStep = Math.max(1, Math.ceil(maxX / 8));
  const xTicks = [];
  for (let i = 0; i <= maxX; i += xStep) xTicks.push(i);

  const bandW = innerW / maxX;
  const hp = hover != null ? points[hover] : null;
  const tipW = 132;
  const tipX = hover != null ? Math.min(Math.max(x(hover) + 12, pad.left), W - tipW - 4) : 0;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="众筹数据看板">
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#c9c0aa" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#c9c0aa" />
      <line x1={pad.left + innerW} y1={pad.top} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#c9c0aa" />

      <g fontSize="10" fontFamily="sans-serif">
        {leftTicks.map((v, k) => (
          <g key={`lt${k}`}>
            <line x1={pad.left - 4} y1={yRaised(v)} x2={pad.left} y2={yRaised(v)} stroke="#c9c0aa" />
            <text x={pad.left - 7} y={yRaised(v) + 3} textAnchor="end" fill="#3f5e50">{fmtEth(v)}</text>
          </g>
        ))}
        {rightTicks.map((v, k) => (
          <g key={`rt${k}`}>
            <line x1={pad.left + innerW} y1={yCount(v)} x2={pad.left + innerW + 4} y2={yCount(v)} stroke="#c9c0aa" />
            <text x={pad.left + innerW + 7} y={yCount(v) + 3} textAnchor="start" fill="#a8754c">{v}</text>
          </g>
        ))}
        {xTicks.map((i, k) => (
          <g key={`xt${k}`}>
            <line x1={x(i)} y1={pad.top + innerH} x2={x(i)} y2={pad.top + innerH + 4} stroke="#c9c0aa" />
            <text x={x(i)} y={pad.top + innerH + 16} textAnchor="middle" fill="#5c574c">{i}</text>
          </g>
        ))}
      </g>

      <path d={line(yRaised, "raised")} fill="none" stroke="#3f5e50" strokeWidth="2.5" />
      {points.map((p, i) => (
        <circle key={`r${i}`} cx={x(i)} cy={yRaised(p.raised)} r="3" fill="#3f5e50" />
      ))}

      <path d={line(yCount, "count")} fill="none" stroke="#a8754c" strokeWidth="2" strokeDasharray="5 4" />
      {points.map((p, i) => (
        <circle key={`c${i}`} cx={x(i)} cy={yCount(p.count)} r="2.5" fill="#a8754c" />
      ))}

      {hp && (
        <g>
          <line x1={x(hover)} y1={pad.top} x2={x(hover)} y2={pad.top + innerH} stroke="#1a1a1a" strokeDasharray="3 3" opacity="0.35" />
          <circle cx={x(hover)} cy={yRaised(hp.raised)} r="5" fill="#3f5e50" stroke="#fff" strokeWidth="1.5" />
          <circle cx={x(hover)} cy={yCount(hp.count)} r="5" fill="#a8754c" stroke="#fff" strokeWidth="1.5" />
          <g transform={`translate(${tipX}, ${pad.top})`}>
            <rect width={tipW} height="62" rx="4" fill="#fcfbf7" stroke="#e0d9c8" />
            <text x="12" y="19" fontSize="11" fill="#5c574c">
              {hover === 0 ? "起始" : `第 ${hover} 笔投资`}
            </text>
            <text x="12" y="38" fontSize="12" fill="#3f5e50">已筹 {hp.raised.toFixed(2)} ETH</text>
            <text x="12" y="55" fontSize="12" fill="#a8754c">参与 {hp.count} 人</text>
          </g>
        </g>
      )}

      {points.map((p, i) => (
        <rect
          key={`hit${i}`}
          x={x(i) - bandW / 2}
          y={pad.top}
          width={bandW}
          height={innerH}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        />
      ))}

      <g fontSize="11" fontFamily="sans-serif">
        <line x1={pad.left} y1={11} x2={pad.left + 20} y2={11} stroke="#3f5e50" strokeWidth="2.5" />
        <text x={pad.left + 26} y={14} fill="#1a1a1a">已筹 ETH</text>
        <line x1={pad.left + 140} y1={11} x2={pad.left + 160} y2={11} stroke="#a8754c" strokeWidth="2" strokeDasharray="5 4" />
        <text x={pad.left + 166} y={14} fill="#1a1a1a">参与人数</text>
        <text x={pad.left + innerW / 2} y={H - 8} textAnchor="middle" fill="#5c574c">
          投资笔数
        </text>
        <text
          transform={`rotate(-90 16 ${pad.top + innerH / 2})`}
          x={16}
          y={pad.top + innerH / 2}
          textAnchor="middle"
          fill="#3f5e50"
        >
          已筹 ETH
        </text>
        <text
          transform={`rotate(90 ${W - 16} ${pad.top + innerH / 2})`}
          x={W - 16}
          y={pad.top + innerH / 2}
          textAnchor="middle"
          fill="#a8754c"
        >
          参与人数
        </text>
      </g>
    </svg>
  );
}

export default FundingChart;
