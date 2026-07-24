import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-[24px] border border-white/10 bg-slate-900/80 ${className}`.trim()}>
      {children}
    </div>
  );
}
