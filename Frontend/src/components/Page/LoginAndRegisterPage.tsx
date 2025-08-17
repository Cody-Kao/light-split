import { useEffect, useState } from "react";
import Login from "../Form/Login";
import Register from "../Form/Register";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "../../context/LoginContextProvider";
import Skeleton from "../Skeleton";

export default function LoginAndRegisterPage() {
  const { isChecking, user } = useLoginContext();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      console.log("user is logged in already");
      navigate("/home");
    }
  }, [user]);

  if (isChecking) {
    return <Skeleton />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--primary-bg)] px-4 py-8">
      <div className="w-[85%] max-w-[500px] rounded-lg bg-[var(--second-white)] px-6 py-8 shadow-xl sm:w-[75%] lg:w-[60%]">
        {/* Header with toggle buttons */}
        <div className="mb-6 flex justify-around border-b border-gray-300">
          <button
            onClick={() => setIsLogin(true)}
            className={`w-full py-2 text-lg font-semibold hover:cursor-pointer ${
              isLogin
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            登入
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`w-full py-2 text-lg font-semibold hover:cursor-pointer ${
              !isLogin
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            註冊
          </button>
        </div>

        {/* Form area */}
        {isLogin ? <Login /> : <Register />}
      </div>
    </div>
  );
}
