import { Toaster } from "sonner";
import NavBar from "./components/NavBar";
import { Outlet } from "react-router";
import { useLocalStorage } from "./components/hooks/useLocalStorage";
import ScrollToTop from "./components/Page/ScrollToTop";
import ScrollToTopArrow from "./components/ScrollToTopArrow";
import { useEffect } from "react";

function App() {
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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--second-white)]">
      <div
        id="AppContainer"
        className="relative flex h-full w-[70%] max-w-[1200px] min-w-[420px] flex-col overflow-auto bg-[var(--primary-bg)]"
      >
        <ScrollToTopArrow />
        <ScrollToTop />
        <Toaster
          richColors
          position="top-center"
          toastOptions={{
            classNames: {
              title: "text-[16px] font-bold",
              description: "text-[16px]",
            },
          }}
        />
        {/* nav bar */}
        <NavBar isDark={isDark} toggleDarkMode={toggleDarkMode} />
        {/* main section */}
        <Outlet />
      </div>
    </div>
  );
}

export default App;
