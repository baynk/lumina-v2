'use client';

import { useEffect, useMemo, useRef } from 'react';

type ScrollWheelPickerProps = {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  ariaLabel?: string;
  circular?: boolean;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const SIDE_PADDING = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
const CIRCULAR_REPEAT_COUNT = 5;
const SETTLE_TIMEOUT_MS = 200;

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length - 1));
}

export default function ScrollWheelPicker({
  items,
  selectedIndex,
  onChange,
  ariaLabel,
  circular = false,
}: ScrollWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const initialisedRef = useRef(false);
  const userScrollingRef = useRef(false);

  const boundedIndex = useMemo(() => clampIndex(selectedIndex, items.length), [items.length, selectedIndex]);
  const isCircular = circular && items.length > 1;
  const middleSetStart = isCircular ? Math.floor(CIRCULAR_REPEAT_COUNT / 2) * items.length : 0;
  const renderedItems = useMemo(
    () =>
      isCircular
        ? Array.from({ length: items.length * CIRCULAR_REPEAT_COUNT }, (_, index) => items[index % items.length])
        : items,
    [isCircular, items]
  );

  const getNormalizedIndex = (rawIndex: number) => {
    if (!isCircular || items.length === 0) return clampIndex(rawIndex, items.length);
    return ((rawIndex % items.length) + items.length) % items.length;
  };

  const findNearestVirtualIndex = (rawIndex: number, actualIndex: number) => {
    if (!isCircular) return actualIndex;

    let nearest = middleSetStart + actualIndex;
    let bestDistance = Math.abs(nearest - rawIndex);

    for (let set = 0; set < CIRCULAR_REPEAT_COUNT; set += 1) {
      const candidate = set * items.length + actualIndex;
      const distance = Math.abs(candidate - rawIndex);
      if (distance < bestDistance) {
        nearest = candidate;
        bestDistance = distance;
      }
    }

    return nearest;
  };

  const recenterIfNeeded = (container: HTMLDivElement) => {
    if (!isCircular) return Math.round(container.scrollTop / ITEM_HEIGHT);

    const rawIndex = Math.round(container.scrollTop / ITEM_HEIGHT);
    const normalizedIndex = getNormalizedIndex(rawIndex);
    const shouldRecenter = rawIndex < items.length || rawIndex >= items.length * (CIRCULAR_REPEAT_COUNT - 1);

    if (shouldRecenter) {
      container.scrollTop = (middleSetStart + normalizedIndex) * ITEM_HEIGHT;
      return middleSetStart + normalizedIndex;
    }

    return rawIndex;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (userScrollingRef.current) return;

    const targetIndex = isCircular
      ? findNearestVirtualIndex(Math.round(container.scrollTop / ITEM_HEIGHT), boundedIndex)
      : boundedIndex;
    const nextTop = targetIndex * ITEM_HEIGHT;
    if (Math.abs(container.scrollTop - nextTop) < 1) return;
    container.scrollTo({ top: nextTop, behavior: initialisedRef.current ? 'smooth' : 'auto' });
    initialisedRef.current = true;
  }, [boundedIndex, isCircular]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const settleToNearest = () => {
    const container = containerRef.current;
    if (!container) return;
    if (userScrollingRef.current) return;
    timeoutRef.current = null;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rawIndex = recenterIfNeeded(container);
      const nextIndex = getNormalizedIndex(Math.round(rawIndex));
      const targetIndex = isCircular ? middleSetStart + nextIndex : nextIndex;
      container.scrollTo({ top: targetIndex * ITEM_HEIGHT, behavior: 'smooth' });
      if (nextIndex !== boundedIndex) onChange(nextIndex);
    });
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rawIndex = Math.round(container.scrollTop / ITEM_HEIGHT);
      const nextIndex = getNormalizedIndex(rawIndex);
      if (nextIndex !== boundedIndex) {
        navigator.vibrate?.(10);
        onChange(nextIndex);
      }
    });

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(settleToNearest, SETTLE_TIMEOUT_MS);
  };

  return (
    <div className="lumina-picker relative w-full">
      <div
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{ top: SIDE_PADDING, height: ITEM_HEIGHT }}
      >
        <div className="lumina-picker-window absolute inset-0" />
        <div className="lumina-picker-line absolute top-0" />
        <div className="lumina-picker-line absolute bottom-0" />
      </div>
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className="scrollbar-none overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          paddingTop: SIDE_PADDING,
          paddingBottom: SIDE_PADDING,
          scrollSnapType: 'y mandatory',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchStart={() => {
          userScrollingRef.current = true;
          if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
          }
        }}
        onTouchEnd={() => {
          userScrollingRef.current = false;
          if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = window.setTimeout(settleToNearest, SETTLE_TIMEOUT_MS);
        }}
        onTouchCancel={() => {
          userScrollingRef.current = false;
          if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = window.setTimeout(settleToNearest, SETTLE_TIMEOUT_MS);
        }}
        onScroll={handleScroll}
      >
        {renderedItems.map((item, index) => {
          const itemIndex = isCircular ? index % items.length : index;
          const rawDistance = Math.abs(itemIndex - boundedIndex);
          const distance = isCircular ? Math.min(rawDistance, items.length - rawDistance) : rawDistance;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.92 : 0.84;
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.78 : 0.52;
          const color = distance === 0 ? '#FDFBF7' : distance === 1 ? '#C0BDD6' : '#8D8B9F';

          return (
            <button
              key={`${item}-${index}`}
              type="button"
              className="flex w-full items-center justify-center bg-transparent px-3 text-center font-body transition-transform duration-200"
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
                scrollSnapStop: 'normal',
                color,
                opacity,
                transform: `scale(${scale})`,
                fontSize: distance === 0 ? 19 : 16,
                fontWeight: distance === 0 ? 500 : 400,
                letterSpacing: distance === 0 ? '0.01em' : '0',
              }}
              onClick={() => onChange(itemIndex)}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
