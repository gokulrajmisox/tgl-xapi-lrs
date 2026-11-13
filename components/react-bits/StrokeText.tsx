'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import './StrokeText.css';

export interface StrokeTextProps {
  text: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  underline?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function StrokeText({
  text,
  strokeColor = '#b9a9d6',
  fillColor = '#b9a9d6',
  strokeWidth = 1.4,
  duration = 1.15,
  delay = 0.2,
  underline = true,
  className = '',
  style = {},
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const strokePathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const fillEl = fillRef.current;
    const lineEl = strokePathRef.current;
    if (!fillEl) return undefined;

    const reduced = Boolean(
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    );

    if (reduced) {
      fillEl.style.clipPath = 'inset(0 0% 0 0)';
      if (lineEl) {
        lineEl.style.strokeDashoffset = '0';
      }
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (lineEl) {
        const len = lineEl.getTotalLength();
        gsap.set(lineEl, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(lineEl, {
          strokeDashoffset: 0,
          duration: duration * 0.85,
          delay,
          ease: 'power3.out',
        });
      }

      gsap.fromTo(
        fillEl,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration,
          delay: delay + 0.14,
          ease: 'power3.inOut',
        },
      );
    }, rootRef);

    return () => ctx.revert();
  }, [duration, delay]);

  const cssVars = {
    '--stroke-color': strokeColor,
    '--fill-color': fillColor,
    '--stroke-width': `${strokeWidth}px`,
    ...style,
  } as CSSProperties;

  return (
    <span
      ref={rootRef}
      className={`stroke-text ${className}`.trim()}
      style={cssVars}
    >
      <span className="stroke-text-outline" aria-hidden="true">
        {text}
      </span>
      <span ref={fillRef} className="stroke-text-fill">
        {text}
      </span>
      {underline && (
        <svg
          className="stroke-text-underline"
          viewBox="0 0 240 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            ref={strokePathRef}
            d="M 4 14 Q 120 4 236 12"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.72"
          />
        </svg>
      )}
    </span>
  );
}
