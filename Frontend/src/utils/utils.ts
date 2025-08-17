import type { TimeLine } from "../const/const";
import type { TGroupCard, ValidationRule } from "../type/type";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { useRef } from "react";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const groupByTime = (groups: TGroupCard[]) => {
  const now = new Date();
  const result: Record<(typeof TimeLine)[number], TGroupCard[]> = {
    這個月: [],
    一個月前: [],
    兩個月前: [],
    半年前: [],
    很久之前: [],
  };

  // First sort by date descending
  const sorted = [...groups].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  for (const group of sorted) {
    const date = new Date(group.createdAt);

    const diffInMonths =
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth());

    if (diffInMonths === 0) {
      result["這個月"].push(group);
    } else if (diffInMonths === 1) {
      result["一個月前"].push(group);
    } else if (diffInMonths === 2) {
      result["兩個月前"].push(group);
    } else if (diffInMonths <= 6) {
      result["半年前"].push(group);
    } else {
      result["很久之前"].push(group);
    }
  }

  return result;
};

export const ValidateInput = (
  input: string,
  ...validationRules: ValidationRule[]
): [boolean, string] => {
  for (const { rule, errorMsg } of validationRules) {
    const isValid = rule.test(input);
    if (!isValid) {
      return [false, errorMsg];
    }
  }
  return [true, ""];
};

export const trimZero = (input: string): string => {
  if (input.startsWith("0")) return input.slice(1);
  return input;
};
export const formatNumberInput = (value: string): string => {
  // Prevent leading '.' (e.g., ".123" → "0.123")
  if (value.startsWith(".")) {
    value = "0" + value;
  }

  // Trim leading zeros unless it's "0.xxx"
  if (/^0\d+/.test(value)) {
    value = trimZero(value); // removes leading zero from things like "0123"
  }

  // Prevent completely empty string
  if (value === "") {
    value = "0";
  }

  return value;
};

export const showToast = (content: string, success?: boolean) => {
  if (success) {
    toast.info("系統提示", {
      description: content,
      action: { label: "知道了", onClick: () => {} },
    });
  } else {
    toast.error("系統提示", {
      description: content,
      action: { label: "知道了", onClick: () => {} },
    });
  }
};

export const useDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
) => {
  // 如果用let去declare，則會在re-render的時候lose掉原本的值
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return [
    (...args: Parameters<T>) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    (...args: Parameters<T>) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      callback(...args);
    },
  ];
};
