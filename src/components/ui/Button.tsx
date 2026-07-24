import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function Button({ children, className = "", type = "button" }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 ${className}`.trim()}
    >
      {children}
    </button>
  );
}
