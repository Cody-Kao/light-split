import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

type SelectProps = {
  options: [string, string][];
} & ComponentProps<"select">;

export default function Select({ options, className, ...props }: SelectProps) {
  return (
    <select className={cn("w-full hover:cursor-pointer", className)} {...props}>
      {options.map((option) => (
        <option key={option[0]} value={option[0]}>
          {option[1]}
        </option>
      ))}
    </select>
  );
}
