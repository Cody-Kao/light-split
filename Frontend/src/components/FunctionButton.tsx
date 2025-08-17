import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

type FunctionButtonProps = {} & ComponentProps<"button">;

export default function FunctionButton({
  className,
  onClick,
  children,
  ...props
}: FunctionButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg bg-[var(--second-gray)] px-4 py-2 font-bold transition-all duration-200 hover:cursor-pointer hover:bg-[var(--third-blue)] dark:hover:text-white",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
