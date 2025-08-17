import { FaRegCircleUser } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { IoSunny } from "react-icons/io5";
import { FaMoon } from "react-icons/fa";
import { useNavigate } from "react-router";
import { useLoginContext } from "../context/LoginContextProvider";
import ImageDisplay from "./ImageDisplay";
import { useEffect } from "react";

interface NavBarProps {
  isDark: boolean;
  toggleDarkMode: () => void;
}

export default function NavBar({ isDark, toggleDarkMode }: NavBarProps) {
  const { isChecking, user } = useLoginContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isChecking && !user) {
      navigate("/home/login");
    }
  }, [isChecking, user]);

  if (isChecking) return null;
  return (
    <div className="flex w-full items-center bg-[var(--third-blue)] px-4 py-2">
      {/* logo */}
      <div onClick={() => navigate("/home")} className="hover:cursor-pointer">
        <FaHome size={32} />
      </div>
      {/* dark mode toggle */}
      <button
        onClick={() => toggleDarkMode()}
        className="relative mr-2 ml-auto flex h-7 w-16 items-center rounded-full bg-gray-300 p-1 transition-colors duration-300 hover:cursor-pointer sm:mr-10 sm:h-8 sm:w-18 dark:bg-gray-600"
      >
        <div
          className={`flex h-6 w-7 transform items-center justify-center rounded-full bg-[var(--second-white)] shadow-md transition-transform duration-300 sm:h-7 sm:w-8 ${
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

      <div className="aspect-square w-[40px] rounded-full hover:cursor-pointer">
        <ImageDisplay
          onClick={() => navigate("user")}
          className="h-full w-full"
          fallback={(props) => <FaRegCircleUser {...props} />}
          imageURL={user?.image}
        />
      </div>
    </div>
  );
}
