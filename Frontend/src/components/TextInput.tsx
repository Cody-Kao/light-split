import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

type InputProps = {} & ComponentProps<"input">;

export default function TextInput({
  value,
  onChange,
  placeholder,
  className,
  ...props
}: InputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn(
        `block w-full rounded-lg bg-[var(--second-gray)] px-4 py-2 outline-none`,
        className,
      )}
      {...props}
    />
  );
}
