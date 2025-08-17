import type { ValidationRule } from "../type/type";

export const TimeLine = [
  "這個月",
  "一個月前",
  "兩個月前",
  "半年前",
  "很久之前",
];

export const NonEmpty: ValidationRule = {
  rule: /^(?!\s*$).+/,
  errorMsg: "不得為空",
};
export const OnlyAlphanumericChineseAndSpace: ValidationRule = {
  rule: /^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/,
  errorMsg: "只能含有數字、英文、中文字符與空白",
};
export const MustContainNumberLowerUpperCase: ValidationRule = {
  rule: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
  errorMsg: "必須包含至少一個小寫英文、一個大寫英文與一個數字",
};
export const PositiveNumberOnly: ValidationRule = {
  rule: /^(0|[1-9]\d*)(\.\d+)?$/,
  errorMsg: "只能輸入正數，且不得為負數或非數字",
};
export const NonSpecialCharacter: ValidationRule = {
  rule: /^[^!@#$%^&*(),.?":{}|<>]+$/,
  errorMsg: "不得包含特殊字元(! @ # $ %...)",
};
export const LessThan20Words: ValidationRule = {
  rule: /^.{0,20}$/,
  errorMsg: "不得超過20個字元",
};
export const LessThan10Words: ValidationRule = {
  rule: /^.{0,10}$/,
  errorMsg: "不得超過10個字元",
};

export const currencyOptions: [string, string][] = [
  ["台幣", "台幣(NTD)"],
  ["日幣", "日幣(JPY)"],
  ["美金", "美金(USD)"],
];
export const currency = ["台幣", "日幣", "美金"] as const;

export const maxFileLimit = 3 * 1024 * 1024; // 3MB

export const colors = [
  "rgb(147, 197, 253)", // blue-300
  "rgb(134, 239, 172)", // green-300
  "rgb(252, 165, 165)", // red-300
  "rgb(252, 211, 77)", // yellow-300
  "rgb(216, 180, 254)", // purple-300
  "rgb(249, 168, 212)", // pink-300
  "rgb(165, 180, 252)", // indigo-300
  "rgb(94, 234, 212)", // teal-300
  "rgb(253, 186, 116)", // orange-300
  "rgb(209, 213, 219)", // gray-300
  "rgb(190, 242, 100)", // lime-300
  "rgb(253, 224, 71)", // amber-300
  "rgb(255, 207, 115)", // warm-gray-300 (custom-ish)
  "rgb(186, 230, 253)", // sky-300
  "rgb(255, 180, 255)", // fuchsia-300 (approximate)
];
