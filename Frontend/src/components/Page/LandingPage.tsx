import { useLocalStorage } from "../hooks/useLocalStorage";
import ScrollToTop from "../Page/ScrollToTop";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { IoSunny } from "react-icons/io5";
import { FaMoon } from "react-icons/fa";
import { useNavigate } from "react-router";
import { cn } from "../../utils/utils";
import { ArrowUp } from "lucide-react";
import { useLoginContext } from "../../context/LoginContextProvider";

type RowData = {
  phoneImage: string;
  desktopImage: string;
  title: string;
  description: string;
};
const data: RowData[] = [
  {
    phoneImage: "assets/screenshot-1-phone.png",
    desktopImage: "assets/screenshot-1-desktop.png",
    title: "清晰介面",
    description: "輕鬆與好友一同管理開支",
  },
  {
    phoneImage: "assets/screenshot-2-phone.png",
    desktopImage: "assets/screenshot-2-desktop.png",
    title: "便捷設計",
    description: "花費開支輕鬆搞定",
  },
  {
    phoneImage: "assets/screenshot-3-phone.png",
    desktopImage: "assets/screenshot-3-desktop.png",
    title: "彙整圖表",
    description: "結算花費一目瞭然",
  },
];

function LandingPage() {
  const { isChecking, user } = useLoginContext();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useLocalStorage("light-split-dark-mode", false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  useEffect(() => {
    if (!isChecking && user) {
      navigate("/home");
    }
  }, [isChecking, user]);

  if (isChecking) return null;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--second-white)] dark:bg-gray-900">
      <div
        id="AppContainer"
        className="relative flex min-h-screen w-full flex-col overflow-auto bg-[var(--primary-bg)] dark:bg-gray-900"
      >
        <ScrollToTopArrow />
        <ScrollToTop />
        <CursorLimelight />
        {/* Nav */}
        <Nav>
          <DarkModeToggle isDark={isDark} toggleDarkMode={toggleDarkMode} />
        </Nav>

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
          {/* Right side - texts */}
          <div className="flex flex-col gap-6">
            <h1 className="animate-gradient bg-gradient-to-r from-yellow-500 via-blue-500 to-amber-500 bg-clip-text pb-1 text-6xl leading-[1.2] font-bold text-transparent">
              Light Split
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              A simple yet powerful way to split costs with friends.
            </p>
            <button
              onClick={() => navigate("home/login")}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:cursor-pointer hover:shadow-xl"
            >
              馬上體驗
            </button>
          </div>

          {/* Custom CSS for animated gradient */}
          <style>
            {`
            @keyframes gradient-move {
            0% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
            100% {
                background-position: 0% 50%;
            }
            }
            .animate-gradient {
            background-size: 200% 200%;
            animation: gradient-move 4s ease infinite;
            }
            `}
          </style>
        </section>

        {/* App Display Section */}
        <section className="flex flex-col gap-16 px-6 py-12">
          {data.map((rowData, index) => (
            <FeatureRow key={index} rowData={rowData} />
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-auto bg-gray-100 px-6 py-4 text-center text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          © {new Date().getFullYear()} Light Split. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;

function DarkModeToggle({
  isDark,
  toggleDarkMode,
}: {
  isDark: boolean;
  toggleDarkMode: () => void;
}) {
  return (
    <button
      onClick={() => toggleDarkMode()}
      className="relative ml-auto flex h-8 w-18 items-center rounded-full bg-gray-300 p-1 transition-colors duration-300 hover:cursor-pointer dark:bg-gray-600"
    >
      <div
        className={`flex h-7 w-8 transform items-center justify-center rounded-full bg-[var(--second-white)] shadow-md transition-transform duration-300 ${
          isDark ? "translate-x-8" : "translate-x-0"
        }`}
      />
      <div className="absolute top-1 left-0 h-[80%] w-[50%] text-yellow-500 dark:text-gray-500">
        <IoSunny className="h-[90%] w-full" />
      </div>
      <div className="absolute top-1 right-0 h-[80%] w-[50%] text-gray-200 dark:text-yellow-400">
        <FaMoon className="h-[90%] w-full" />
      </div>
    </button>
  );
}

function Nav({ children }: { children: ReactElement }) {
  const navigate = useNavigate();
  return (
    <nav className="flex h-[60px] w-full items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
      <div className="aspect-square w-[35px] font-bold text-gray-800 dark:text-white">
        <img
          src="assets/light-split-logo.png"
          className="object-fit"
          alt="logo"
        />
      </div>
      <div className="flex items-center gap-4">
        {children}
        <button
          onClick={() => navigate("home/login")}
          className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:cursor-pointer hover:from-blue-600 hover:to-indigo-600"
        >
          登入
        </button>
      </div>
    </nav>
  );
}

/* Feature Row */
function FeatureRow({ rowData }: { rowData: RowData }) {
  return (
    <div className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-3`}>
      {/* Left side: mockups (2/3) */}
      <div className="relative col-span-2 flex flex-row items-center justify-center gap-6 lg:gap-10">
        <PhoneMockup
          screenshot={rowData.phoneImage}
          className="left-[-15%] md:left-0"
        />
        <DesktopMockup
          className="absolute bottom-[10px] left-[80%] translate-x-[-80%] md:left-[70%] md:translate-x-[-70%] lg:relative lg:left-0 lg:translate-x-0"
          screenshot={rowData.desktopImage}
        />
      </div>

      {/* Right side: text (1/3) */}
      <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
        <h3 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {rowData.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {rowData.description}
        </p>
      </div>
    </div>
  );
}

/* Phone Mockup */
function PhoneMockup({
  screenshot,
  className,
}: {
  screenshot: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19] w-[14rem] overflow-hidden rounded-[1.5rem] border-4 border-gray-300 bg-gray-100 shadow-lg dark:border-gray-400 dark:bg-gray-800",
        className,
      )}
    >
      {/* Screenshot */}
      <img
        src={screenshot}
        alt="App Screenshot"
        className="absolute inset-1 h-[calc(100%+0.5rem)] w-[calc(100%-0.5rem)] rounded-[1.2rem] object-cover"
      />

      {/* Optional top notch / speaker */}
      <div className="absolute top-2 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}

/* Desktop Mockup */
function DesktopMockup({
  screenshot,
  className,
}: {
  screenshot: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-[14rem] w-[21.5rem] overflow-hidden rounded-lg border-4 border-gray-300 bg-gray-100 shadow-lg dark:border-gray-400 dark:bg-gray-800",
        className,
      )}
    >
      {/* Screenshot */}
      <img
        src={screenshot}
        alt="App Screenshot"
        className={`absolute inset-0 h-[calc(100%+0.25rem)] rounded-md object-cover`}
      />

      {/* Optional top bar */}
      <div className="absolute -top-3 left-1/2 h-3 w-16 -translate-x-1/2 rounded-t-md bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}

function CursorLimelight() {
  const lightRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const position = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      // Interpolate for smooth movement
      position.current.x += (target.current.x - position.current.x) * 0.15;
      position.current.y += (target.current.y - position.current.y) * 0.15;

      if (lightRef.current) {
        lightRef.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px) translate(-50%, -50%)`;
      }

      requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    requestAnimationFrame(animate);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={lightRef}
      className="pointer-events-none fixed h-36 w-36 rounded-full bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 opacity-60 blur-[120px] dark:from-yellow-500 dark:via-purple-300 dark:to-indigo-500 dark:opacity-90"
    />
  );
}

function ScrollToTopArrow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollTop / scrollHeight;
      setShow(scrollPercent > 0.3);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
