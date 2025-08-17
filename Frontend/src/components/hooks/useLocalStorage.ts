import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export const useLocalStorage = <T>(
  key: string,
  initValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, () => void] => {
  const [value, setValue] = useState<T>(() => {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue !== null) {
      try {
        return JSON.parse(storedValue) as T;
      } catch (error) {
        console.warn("Failed to parse localStorage value:", error);
      }
    }
    return typeof initValue === "function"
      ? (initValue as () => T)()
      : initValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Failed to write to localStorage:", error);
    }
  }, [key, value]);

  const removeValue = () => {
    window.localStorage.removeItem(key);
    setValue(
      typeof initValue === "function" ? (initValue as () => T)() : initValue,
    );
  };

  return [value, setValue, removeValue];
};
