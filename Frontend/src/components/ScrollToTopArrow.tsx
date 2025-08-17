import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopArrow() {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = document.getElementById("AppContainer");
    if (!container) return;

    containerRef.current = container;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const scrollPercent = scrollTop / scrollHeight;
      setShow(scrollPercent > 0.3);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return show ? (
    <button
      onClick={scrollToTop}
      className="fixed right-6 bottom-6 z-50 rounded-full bg-gray-800/50 p-3 text-white shadow-lg transition-opacity hover:cursor-pointer hover:bg-gray-700 dark:bg-gray-400/90"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  ) : null;
}
