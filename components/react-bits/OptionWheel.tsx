'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './OptionWheel.css';

export interface OptionWheelItem {
  id: string;
  label: string;
  shortLabel?: string;
  priceLabel: string;
  meta: string;
}

export interface OptionWheelProps {
  items: OptionWheelItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  size?: number;
  className?: string;
}

export default function OptionWheel({
  items,
  selectedIndex,
  onSelectIndex,
  size = 410,
  className = '',
}: OptionWheelProps) {
  const rotorRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startAngle: number;
    baseRotation: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: null,
    startAngle: 0,
    baseRotation: 0,
    moved: false,
  });

  const [dragging, setDragging] = useState(false);
  const [liveRotation, setLiveRotation] = useState(0);

  const count = Math.max(1, items.length);
  const stepDeg = 360 / count;
  const targetRotation = -selectedIndex * stepDeg;

  useEffect(() => {
    const rotor = rotorRef.current;
    if (!rotor || dragging) return undefined;

    const reduced = Boolean(
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    );

    if (reduced) {
      setLiveRotation(targetRotation);
      gsap.set(rotor, { rotation: targetRotation });
      return undefined;
    }

    const state = { angle: liveRotation };
    const tween = gsap.to(state, {
      angle: targetRotation,
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: () => {
        setLiveRotation(state.angle);
        gsap.set(rotor, { rotation: state.angle });
      },
    });

    return () => {
      tween.kill();
    };
    // Intentionally animate smoothly toward targetRotation when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRotation, dragging]);

  const activeItem = items[selectedIndex] ?? items[0];

  const spokePositions = useMemo(() => {
    const radiusPercent = 33;
    return items.map((item, idx) => {
      const deg = idx * stepDeg - 90;
      const rad = (deg * Math.PI) / 180;
      const x = 50 + radiusPercent * Math.cos(rad);
      const y = 50 + radiusPercent * Math.sin(rad);
      return { item, idx, x, y };
    });
  }, [items, stepDeg]);

  const stepBy = (delta: number) => {
    const next = (selectedIndex + delta + count) % count;
    onSelectIndex(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectIndex(count - 1);
    }
  };

  const getPointerAngle = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startAngle: getPointerAngle(e),
      baseRotation: liveRotation,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ds = dragStateRef.current;
    if (!ds.active || e.pointerId !== ds.pointerId) return;
    let delta = getPointerAngle(e) - ds.startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (Math.abs(delta) > 3) ds.moved = true;
    const nextRot = ds.baseRotation + delta;
    setLiveRotation(nextRot);
    if (rotorRef.current) {
      gsap.set(rotorRef.current, { rotation: nextRot });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ds = dragStateRef.current;
    if (!ds.active || e.pointerId !== ds.pointerId) return;
    ds.active = false;
    setDragging(false);
    if (ds.moved) {
      const normalized = Math.round(-liveRotation / stepDeg);
      const nextIdx = ((normalized % count) + count) % count;
      onSelectIndex(nextIdx);
    }
  };

  return (
    <div className={`option-wheel-shell ${className}`.trim()}>
      <div
        role="listbox"
        tabIndex={0}
        aria-label="Interactive programme selector wheel. Use left or right arrow keys to rotate programmes."
        aria-activedescendant={activeItem ? `wheel-opt-${activeItem.id}` : undefined}
        onKeyDown={handleKeyDown}
        style={{ '--wheel-size': `${size}px` } as CSSProperties}
        className="option-wheel-ring focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b9a9d6]"
      >
        {/* Outer guide halo & top indicator */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1.5 z-20 -translate-x-1/2"
        >
          <span className="block h-2.5 w-2.5 rotate-45 bg-[#b9a9d6] shadow-[0_0_12px_rgba(185,169,214,0.85)]" />
        </div>

        {/* Rotating radial spoke layer */}
        <div
          ref={rotorRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`option-wheel-rotor ${dragging ? 'option-wheel-rotor--dragging' : ''}`}
        >
          {spokePositions.map(({ item, idx, x, y }) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="option-wheel-spoke -translate-x-1/2 -translate-y-1/2"
              >
                <button
                  id={`wheel-opt-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => onSelectIndex(idx)}
                  style={{ transform: `rotate(${-liveRotation}deg)` }}
                  className={`flex min-w-[54px] max-w-[84px] flex-col items-center rounded-2xl border px-1.5 py-1 text-center transition-colors sm:min-w-[78px] sm:max-w-[110px] sm:px-3 sm:py-2 ${
                    isSelected
                      ? 'border-[#b9a9d6] bg-[#f4f3ef] text-[#111111] shadow-[0_10px_28px_rgba(185,169,214,0.28)]'
                      : 'border-white/15 bg-[#151515]/95 text-white/80 hover:border-white/40 hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-full text-[9px] font-medium leading-tight sm:text-[11px]">
                    {item.shortLabel ?? item.label}
                  </span>
                  <span
                    className={`mt-0.5 font-mono text-[9px] tabular-nums sm:text-[10px] ${
                      isSelected ? 'text-black/70' : 'text-[#b9a9d6]'
                    }`}
                  >
                    {item.priceLabel}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Stationary center hub readout */}
        {activeItem && (
          <div className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center p-12 sm:p-20">
            <div className="pointer-events-auto flex w-36 flex-col items-center rounded-full border border-white/15 bg-[#101012]/95 px-3 py-3.5 text-center shadow-2xl backdrop-blur-md sm:w-48 sm:px-4 sm:py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                {String(selectedIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-[#f4f3ef] sm:text-xs">
                {activeItem.label}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[#f4f3ef] sm:text-sm">
                {activeItem.priceLabel}
              </p>
              <p className="mt-0.5 hidden text-[10px] text-white/45 sm:block">{activeItem.meta}</p>
              <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
                <button
                  type="button"
                  onClick={() => stepBy(-1)}
                  aria-label="Previous course on wheel"
                  className="grid size-9 place-items-center rounded-full border border-white/15 text-white/75 hover:border-white/40 hover:text-white sm:size-10"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepBy(1)}
                  aria-label="Next course on wheel"
                  className="grid size-9 place-items-center rounded-full border border-white/15 text-white/75 hover:border-white/40 hover:text-white sm:size-10"
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
