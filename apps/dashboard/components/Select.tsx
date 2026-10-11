'use client';

import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes, ReactNode } from 'react';

/**
 * A styled <select> with room for its own chevron. The native OS arrow is hidden
 * (appearance-none) and a consistent ChevronDown is drawn on the right with padding,
 * so every dropdown across the dashboard reads the same. Drop-in for a native
 * <select>: pass the same className / value / onChange and keep your <option> children.
 *
 * The wrapper is block-level, so a full-width select (className includes w-full) fills
 * its container, and inside a flex row it shrinks to the select's content width. Pass
 * `wrapperClassName` for edge cases (e.g. 'w-full' when the select isn't in flow).
 */
export function Select({
  className = '',
  wrapperClassName = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string; children?: ReactNode }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className={`appearance-none pr-10 ${className}`}>
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted"
      />
    </div>
  );
}
