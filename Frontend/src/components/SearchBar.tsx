import { useRef, type ComponentProps } from "react";
import { SlMagnifier } from "react-icons/sl";
import { cn } from "../utils/utils";

type SearchBarProps = {
  debouncedCallback?: (val: any | any[]) => void;
  directCallback?: (val: any | any[]) => void;
} & ComponentProps<"div">;

export default function SearchBar({
  className,
  debouncedCallback,
  directCallback,
  ...props
}: SearchBarProps) {
  const inputRef = useRef<null | HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "flex w-[50%] max-w-[320px] items-center rounded-lg bg-[var(--second-gray)] text-xl md:w-[70%]",
        className,
      )}
      {...props}
    >
      <input
        ref={inputRef}
        onKeyUp={(e) => {
          if (directCallback && inputRef.current && e.key === "Enter")
            directCallback(inputRef.current.value);
        }}
        onInput={() => {
          if (debouncedCallback && inputRef.current) {
            debouncedCallback(inputRef.current.value);
            console.log(inputRef.current.value);
          }
        }}
        className="min-w-0 flex-grow px-2 py-1 outline-0 sm:px-4 sm:py-2"
      />
      <button
        onClick={() => {
          if (directCallback && inputRef.current)
            directCallback(inputRef.current.value);
        }}
        className="shrink-0 px-2 hover:cursor-pointer"
      >
        <SlMagnifier />
      </button>
    </div>
  );
}
