import { useEffect, useRef, type ComponentProps } from "react";

import { ImCross } from "react-icons/im";
import { cn } from "../../utils/utils";

type ModalProps = {
  isOpen: boolean;
  overlayOpacity?: number;
  closeModal: () => void;
} & ComponentProps<"div">;

export default function Modal({
  isOpen,
  overlayOpacity,
  closeModal,
  className,
  children,
  ...props
}: ModalProps) {
  const overlayClass = {
    10: "bg-black/10",
    20: "bg-black/20",
    30: "bg-black/30",
    40: "bg-black/40",
    50: "bg-black/50",
    60: "bg-black/60",
    70: "bg-black/70",
  }[overlayOpacity ?? 70];
  const scrollableRef = useRef<HTMLDivElement>(null);
  const transitionClass = isOpen
    ? "visible opacity-100 translate-y-0"
    : "invisible opacity-0 translate-y-[-30px]";

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (scrollableRef.current) {
          scrollableRef.current.scrollTop = 0;
        }
      }, 50); // Small delay to account for transitions

      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  return (
    <>
      {/* overlay */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          closeModal();
        }}
        {...props}
        className={cn(
          `${isOpen ? "visible block opacity-100" : "invisible hidden opacity-0"} fixed inset-0 z-1000 h-screen w-full ${overlayClass} transition-all duration-300 hover:cursor-pointer`,
        )}
      ></div>

      {/* modal container */}
      <div
        className={cn(
          "fixed top-[10%] left-[50%] z-1000 flex max-h-[80vh] w-[90%] translate-x-[-50%] flex-col rounded-lg bg-[var(--primary-bg)] px-4 py-4 transition-all duration-300 sm:w-[80%] dark:ring-1 dark:ring-gray-500",
          transitionClass,
          className,
        )}
      >
        <header className="flex w-full items-center justify-end">
          <button
            onClick={closeModal}
            className="transition-all duration-200 hover:scale-120 hover:cursor-pointer"
          >
            <ImCross className="dark:text-gray-300" size={24} />
          </button>
        </header>
        {/* modal data area */}
        <div
          ref={scrollableRef}
          className="relative mt-4 flex w-full flex-col items-start justify-start gap-6 overflow-auto"
        >
          {children}
        </div>
      </div>
    </>
  );
}
