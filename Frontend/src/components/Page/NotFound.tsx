import { useEffect } from "react";
import { Link } from "react-router";

export default function NotFound() {
  const isDark = localStorage.getItem("light-split-dark-mode");
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center from-[var(--primary-bg)]">
      {/* Illustration */}
      <img
        src="assets/notFound.png" // Put an SVG or PNG in your public folder
        alt="Not Found Illustration"
        className="animate-wiggle mb-2 w-128"
      />

      {/* Title */}
      <h1 className="text-[50px] font-extrabold tracking-tight text-[var(--primary-font)] sm:text-[60px]">
        404
      </h1>

      {/* Subtitle */}
      <p className="mt-2 text-2xl font-semibold text-gray-700 dark:text-gray-300">
        找不到頁面
      </p>
      <p className="mb-6 max-w-md text-center text-gray-500 dark:text-gray-400">
        抱歉，您訪問的頁面不存在或已被移除。
      </p>

      {/* Go Home Button */}
      <Link
        to="/home"
        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl dark:bg-blue-500"
      >
        回首頁
      </Link>
    </div>
  );
}
