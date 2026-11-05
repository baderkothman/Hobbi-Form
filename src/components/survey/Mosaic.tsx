// A floor of Beirut-style cement tiles, laid one by one as the survey progresses.
// Purely decorative, so assistive tech skips it.
import { memo, type ReactNode } from "react";

const PINE = "#055F56";
const MINT = "#9BD9CC";
const PAPER = "#EAF6F3";
const SUN = "#FFC857";
const TEAL = "#0A9182";

const TILE_COUNT = 40;

function Petal({ bg, leaf }: { bg: string; leaf: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      {[0, 90, 180, 270].map((turn) => (
        <path
          key={turn}
          d="M50 50 Q50 0 0 0 Q0 50 50 50Z"
          fill={leaf}
          transform={`rotate(${turn} 50 50)`}
        />
      ))}
    </>
  );
}

function Arcs({ bg, ring, core }: { bg: string; ring: string; core: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      <circle cx="0" cy="0" r="92" fill={ring} />
      <circle cx="0" cy="0" r="62" fill={bg} />
      <circle cx="0" cy="0" r="32" fill={core} />
    </>
  );
}

function Diamond({ bg, shape, core }: { bg: string; shape: string; core: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      <polygon points="50,0 100,50 50,100 0,50" fill={shape} />
      <circle cx="50" cy="50" r="17" fill={core} />
    </>
  );
}

function Star({ bg, shape, core }: { bg: string; shape: string; core: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      <rect x="20" y="20" width="60" height="60" fill={shape} />
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        fill={shape}
        transform="rotate(45 50 50)"
      />
      <circle cx="50" cy="50" r="13" fill={core} />
    </>
  );
}

function Pinwheel({ bg, blade }: { bg: string; blade: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      {[0, 90, 180, 270].map((turn) => (
        <polygon
          key={turn}
          points="0,0 50,0 50,50"
          fill={blade}
          transform={`rotate(${turn} 50 50)`}
        />
      ))}
    </>
  );
}

function Halves({ bg, shape }: { bg: string; shape: string }) {
  return (
    <>
      <rect width="100" height="100" fill={bg} />
      <path d="M0 50 A50 50 0 0 1 100 50Z" fill={shape} />
    </>
  );
}

const DESIGNS: ReactNode[] = [
  <Petal key="a" bg={PINE} leaf={MINT} />,
  <Arcs key="b" bg={PAPER} ring={TEAL} core={SUN} />,
  <Diamond key="c" bg={MINT} shape={PINE} core={PAPER} />,
  <Pinwheel key="d" bg={PAPER} blade={PINE} />,
  <Star key="e" bg={TEAL} shape={PAPER} core={PINE} />,
  <Halves key="f" bg={SUN} shape={PINE} />,
  <Petal key="g" bg={PAPER} leaf={TEAL} />,
  <Arcs key="h" bg={PINE} ring={MINT} core={PAPER} />,
  <Diamond key="i" bg={PAPER} shape={MINT} core={PINE} />,
  <Star key="j" bg={PINE} shape={MINT} core={SUN} />,
  <Pinwheel key="k" bg={MINT} blade={PAPER} />,
];

/** Scatters the laying order: 17 and 40 share no factor, so each tile gets one turn. */
function layOrder(index: number): number {
  return (index * 17) % TILE_COUNT;
}

// Memoized: the survey re-renders on each keystroke, and the floor rarely changes.
export const Mosaic = memo(function Mosaic({ fraction }: { fraction: number }) {
  const laid = Math.round(fraction * TILE_COUNT);
  return (
    <div className="mosaic" aria-hidden="true">
      {Array.from({ length: TILE_COUNT }, (_, index) => {
        const isLaid = layOrder(index) < laid;
        return (
          <div key={index} className="mosaic-slot">
            <svg
              viewBox="0 0 100 100"
              className={isLaid ? "mosaic-tile is-laid" : "mosaic-tile"}
              style={{ rotate: `${(index % 4) * 90}deg` }}
            >
              {DESIGNS[(index * 5 + (index % 3)) % DESIGNS.length]}
            </svg>
          </div>
        );
      })}
    </div>
  );
});
