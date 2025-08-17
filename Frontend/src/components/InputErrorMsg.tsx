import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

type InputErrorMsgProps = {
  content: string;
} & ComponentProps<"span">;

export default function InputErrorMsg({
  content,
  className,
  ...props
}: InputErrorMsgProps) {
  return (
    <span
      className={cn("absolute top-full left-0 text-sm text-red-500", className)}
      {...props}
    >
      {content}
    </span>
  );
}
