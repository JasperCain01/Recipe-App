// Small reusable hooks — no JSX, kept alongside the other pure lib modules.

import { useEffect, useState, type RefObject } from "react";

/** True when the viewport is at or below `breakpointPx` (tracks live resizes). */
export function useNarrowViewport(breakpointPx: number): boolean {
  const query = `(max-width: ${breakpointPx}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpointPx]);

  return narrow;
}

/**
 * Minimal fixed-row-height windowing for a page-scrolled (not inner-scroll)
 * list: tracks window scroll/resize and returns the [start, end) index range
 * that should actually be rendered, given the container's position in the
 * document. Rows outside this range are assumed to all be `rowHeight` tall —
 * callers should avoid virtualizing while a variable-height row (e.g. an
 * expanded detail panel) is showing, since that assumption would break.
 */
export function useWindowedRange(
  itemCount: number,
  rowHeight: number,
  containerRef: RefObject<HTMLElement | null>,
  overscanRows = 8,
): [number, number] {
  const [range, setRange] = useState<[number, number]>([0, Math.min(itemCount, 50)]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || itemCount === 0) {
      setRange([0, itemCount]);
      return;
    }

    const compute = () => {
      const rect = container.getBoundingClientRect();
      const startPx = Math.max(0, -rect.top);
      const endPx = Math.max(0, window.innerHeight - rect.top);
      const start = Math.max(0, Math.floor(startPx / rowHeight) - overscanRows);
      const end = Math.min(itemCount, Math.ceil(endPx / rowHeight) + overscanRows);
      setRange([start, end]);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, rowHeight, overscanRows]);

  return range;
}
