import type { ComponentProps } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";

type PreviousPageArrowProps = {} & ComponentProps<"button">;

export default function PreviousPageArrow({
  className,
  onClick,
  ...props
}: PreviousPageArrowProps) {
  return (
    <button
      onClick={onClick}
      {...props}
      className="text-2xl text-gray-600 hover:cursor-pointer hover:text-[var(--third-blue)] dark:text-[var(--second-gray)]"
    >
      <FaArrowLeftLong />
    </button>
  );
}
