import { type ComponentProps } from "react";
import { cn } from "../utils/utils";
import type { RadioOption } from "../type/type";

type RadioButtonAreaProps = {
  name?: string;
  options: RadioOption[];
  selected: string | boolean;
  onChangeCallback: (value: string) => void;
} & ComponentProps<"label">;

export default function RadioButtonArea({
  name,
  options,
  selected,
  onChangeCallback,
  className,
  ...props
}: RadioButtonAreaProps) {
  return (
    <>
      {options.map((opt, index) => (
        <label
          key={index}
          className={cn("flex items-center gap-2", className)}
          {...props}
        >
          <input
            type="radio"
            name={name}
            value={String(opt.value)}
            checked={selected === opt.value}
            onChange={() => onChangeCallback(String(opt.value))}
            className="accent-blue-600"
          />
          <span className="text-[var(--primary-font)]">{opt.label}</span>
        </label>
      ))}
    </>
  );
}
