import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import type { TUser } from "../type/type";
import { useCheckLogin } from "../Hooks/hooks";
import { UserSchema } from "../Schema/schema";
import { showToast } from "../utils/utils";
import { useQueryClient } from "@tanstack/react-query";

type LoginContextType = {
  user: TUser | null;
  isChecking: boolean;
  loginUser: (user: TUser) => void;
  logoutUser: () => void;
};

const loginContext = createContext<LoginContextType | undefined>(undefined);

export const useLoginContext = () => {
  const context = useContext(loginContext);
  if (context === undefined) {
    throw new Error("context is undefined!");
  }
  return context;
};

export const LoginContextProvider = ({
  children,
}: {
  children: ReactElement | ReactElement[];
}) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const loginUser = useCallback((user: TUser) => {
    console.log("Login user:", user); // check shape
    setUser(user);
  }, []);
  const queryClient = useQueryClient();
  const logoutUser = useCallback(() => {
    console.log("Logged out!");
    queryClient.clear(); // clear cached query data
    setUser(null);
  }, []);
  const { data, isSuccess, isError } = useCheckLogin(UserSchema, user === null);

  useEffect(() => {
    if (isSuccess && data && data.type === "Success") {
      if (data.type === "Success") {
        setUser(data.payload.data);
        showToast("登入成功", true);
        setIsChecking(false);
        return;
      }
    }
    if (isError || (data && data?.type !== "Success")) {
      console.log("not logged in...", data);
      setUser(null);
      setIsChecking(false);
    }
  }, [data, isSuccess, isError]);

  return (
    <loginContext.Provider value={{ user, isChecking, loginUser, logoutUser }}>
      {children}
    </loginContext.Provider>
  );
};
