import { z } from "zod";
import {
  MustContainNumberLowerUpperCase,
  OnlyAlphanumericChineseAndSpace,
} from "../const/const";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  account: z.string(),
  image: z.string().optional(),
  isGoogle: z.boolean(),
  groups: z.array(z.string()),
});

export const LoginSchema = z.object({
  account: z.email({ message: "請輸入正確的電子郵件格式" }),
  password: z
    .string()
    .min(8, { message: "密碼不得低於8個字元" })
    .max(20, { message: "密碼不得超過20個字元" })
    // in field refine(只能針對該欄位)
    .refine((input) => MustContainNumberLowerUpperCase.rule.test(input), {
      message: MustContainNumberLowerUpperCase.errorMsg,
    }),
});

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "名字不得為空" })
      .max(10, { message: "名字不得超過10個字元" })
      .refine((input) => OnlyAlphanumericChineseAndSpace.rule.test(input), {
        message: OnlyAlphanumericChineseAndSpace.errorMsg,
      }),
    account: z.email({ message: "請輸入正確的電子郵件格式" }),
    password: z
      .string()
      .min(8, { message: "密碼不得低於8個字元" })
      .max(20, { message: "密碼不得超過20個字元" })
      .refine((input) => MustContainNumberLowerUpperCase.rule.test(input), {
        message: MustContainNumberLowerUpperCase.errorMsg,
      }),
    confirmPassword: z
      .string()
      .min(8, { message: "確認密碼不得低於8個字元" })
      .max(20, { message: "確認密碼不得超過20個字元" }),
  })
  // root level refine(可交叉檢查)
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"], // attach error to confirmPassword
    message: "密碼與確認密碼不一致",
  });

export const PayloadScheme = z.object({
  field: z.string().optional(),
  message: z.string(),
  data: z.any().optional(),
});

export const ResponseScheme = z.object({
  type: z.literal("Success").or(z.literal("Error")).or(z.literal("Logout")),
  payload: PayloadScheme,
});

export const GroupCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  creatorID: z.string(),
  creatorName: z.string(),
  memberCnt: z.number(),
  settled: z.boolean(),
});
export const GroupsResponseSchema = z.object({
  groupCards: z.array(GroupCardSchema),
  haveMore: z.boolean(),
});

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  creatorID: z.string(),
  expenses: z.array(z.string()),
  settled: z.boolean(),
});

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  userID: z.string(),
  userName: z.string(),
  joined: z.boolean(),
  image: z.string().optional(),
});

export const ExpenseCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  editedAt: z.string(),
  creatorID: z.string(),
  creatorName: z.string(),
});

export const ExpenseCardResponseSchema = z.object({
  expenseCards: z.array(ExpenseCardSchema),
  haveMore: z.boolean(),
});

export const PayerSchema = z.object({
  id: z.string(),
  userID: z.string(),
  name: z.string(),
  amount: z.number(),
});
export const ExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  actualPayer: z.string(),
  amount: z.number(),
  currency: z.literal("台幣").or(z.literal("美金")).or(z.literal("日幣")),
  image: z.string().optional(),
  editedAt: z.string(),
  creatorID: z.string(),
  groupID: z.string(),
  split: z.boolean(),
  payers: z.array(PayerSchema),
  note: z.string(),
});
export const ExpensePageResponseSchema = z.object({
  expense: ExpenseSchema,
  members: z.array(MemberSchema),
  isGroupSettled: z.boolean(),
});

export const CreateGroupResponseSchema = z.object({
  groupID: z.string(),
});

export const GetJoinedMembersResponseSchema = z.object({
  groupName: z.string(),
  members: z.array(MemberSchema),
});

export const GetJoinGroupLinkResponse = z.object({
  link: z.string().or(z.null()),
});

export const OpenGroupMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const GetJoinGroupDataResponseSchema = z.object({
  groupID: z.string(),
  groupName: z.string(),
  members: z.array(OpenGroupMemberSchema),
});

export const PaymentSchema = z.object({
  expenseID: z.string(),
  expenseName: z.string(),
  payerID: z.string(),
  payerName: z.string(),
  receiverID: z.string(),
  receiverName: z.string(),
  date: z.string(),
  amount: z.number(),
});

export const SettlementDataResponseSchema = z.object({
  groupName: z.string(),
  groupCreatorID: z.string(),
  isGroupSettled: z.boolean(),
  payments: z.array(PaymentSchema),
});

export const ChangeProfileImageResponseSchema = z.object({
  link: z.string(),
});

export const SettleGroupResponseSchema = z.object({
  groupID: z.string(),
});
/* // for generic get request scheme
export const BasePayloadSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

// generic builder function
export const createPayloadSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  BasePayloadSchema.extend({
    data: dataSchema.optional(),
  }); */
