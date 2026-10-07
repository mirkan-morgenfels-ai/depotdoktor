const COURSE: ReadonlyArray<readonly [number, number]> = [
  [0, 292],
  [28, 284],
  [56, 289],
  [84, 270],
  [112, 276],
  [140, 252],
  [168, 261],
  [196, 238],
  [224, 246],
  [252, 251],
  [280, 226],
  [308, 233],
  [336, 207],
  [364, 216],
  [392, 191],
  [420, 199],
  [448, 172],
  [476, 181],
  [504, 158],
  [532, 150],
  [560, 163],
  [584, 131],
  [606, 112],
];

const COURSE_PATH = COURSE.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");

const MARKERS = [4, 10, 16, 21];

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <path d="M16 1.75 30.25 16 16 30.25 1.75 16Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.4 19.6 12.2 15.9 15 17.6 18.8 13.3 20.9 14.5 23 12.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="12.1" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function HeroOrnament({ idPrefix, className }: { idPrefix: string; className?: string }) {
  const fillId = `${idPrefix}-fill`;
  const fadeId = `${idPrefix}-fade`;
  const maskId = `${idPrefix}-mask`;
  const last = COURSE[COURSE.length - 1] ?? [606, 112];
  return (
    <svg
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a548" stopOpacity="0.22" />
          <stop offset="1" stopColor="#c9a548" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="640" height="360" fill={`url(#${fadeId})`} />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {[72, 144, 216, 288].map((y) => (
          <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#c9a548" strokeOpacity="0.16" strokeWidth="1" strokeDasharray="2 7" vectorEffect="non-scaling-stroke" />
        ))}
        {[0, 128, 256, 384, 512].map((x) => (
          <line key={x} x1={x} x2={x} y1="340" y2="352" stroke="#c9a548" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" x2="640" y1="340" y2="340" stroke="#c9a548" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={`${COURSE_PATH} L${last[0]} 340 L0 340 Z`} fill={`url(#${fillId})`} />
        {[56, 44, 33, 23, 14, 6].map((offset, index) => (
          <path
            key={offset}
            d={COURSE_PATH}
            transform={`translate(0 ${offset})`}
            fill="none"
            stroke="#c9a548"
            strokeOpacity={0.05 + index * 0.035}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={COURSE_PATH}
          pathLength={1}
          className="draw-line"
          fill="none"
          stroke="#d8bd72"
          strokeWidth="1.75"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {MARKERS.map((index) => {
          const point = COURSE[index];
          if (!point) return null;
          return <circle key={index} cx={point[0]} cy={point[1]} r="3" fill="#0b1626" stroke="#d8bd72" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />;
        })}
        <line x1={last[0]} x2={last[0]} y1={last[1]} y2="340" stroke="#d8bd72" strokeOpacity="0.45" strokeDasharray="3 5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={last[0]} x2="640" y1={last[1]} y2={last[1]} stroke="#d8bd72" strokeOpacity="0.45" strokeDasharray="3 5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx={last[0]} cy={last[1]} r="12" fill="none" stroke="#d8bd72" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="#d8bd72" />
    </svg>
  );
}

export function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <path d="M13 6.5h15.5L37 15v26.5H13Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M28.5 6.5V15H37" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17.5 34.5 22 29.5l3.5 2.5 6-7" fill="none" stroke="#b8912f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 21h8M17.5 25h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
