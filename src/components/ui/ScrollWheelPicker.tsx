'use client';

import { useEffect, useMemo, useRef } from 'react';

type ScrollWheelPickerProps = {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  ariaLabel?: string;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const SIDE_PADDING = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length - 1));
}

export default function ScrollWheelPicker({
  items,
  selectedIndex,
  onChange,
  ariaLabel,
}: ScrollWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const boundedIndex = useMemo(() => clampIndex(selectedIndex, items.length), [items.length, selectedIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nextTop = boundedIndex * ITEM_HEIGHT;
    if (Math.abs(container.scrollTop - nextTop) < 1) return;
    container.scrollTo({ top: nextTop, behavior: 'smooth' });
  }, [boundedIndex]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const settleToNearest = () => {
    const container = containerRef.current;
    if (!container) return;

    const nextIndex = clampIndex(Math.round(container.scrollTop / ITEM_HEIGHT), items.length);
    container.scrollTo({ top: nextIndex * ITEM_HEIGHT, behavior: 'smooth' });
    if (nextIndex !== boundedIndex) onChange(nextIndex);
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const nextIndex = clampIndex(Math.round(container.scrollTop / ITEM_HEIGHT), items.length);
      if (nextIndex !== boundedIndex) onChange(nextIndex);
    });

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(settleToNearest, 250);
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
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - boundedIndex);
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
                scrollSnapStop: 'always',
                color,
                opacity,
                transform: `scale(${scale})`,
                fontSize: distance === 0 ? 19 : 16,
                fontWeight: distance === 0 ? 500 : 400,
                letterSpacing: distance === 0 ? '0.01em' : '0',
              }}
              onClick={() => onChange(index)}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
