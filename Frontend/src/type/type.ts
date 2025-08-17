import type { currency } from "../const/const";
import type {
  LoginSchema,
  RegisterSchema,
  ResponseScheme,
  UserSchema,
  GroupCardSchema,
  GroupSchema,
  MemberSchema,
  ExpenseCardSchema,
  ExpenseSchema,
  PayerSchema,
  ExpensePageResponseSchema,
  GetJoinedMembersResponseSchema,
  GetJoinGroupDataResponseSchema,
  PaymentSchema,
  SettlementDataResponseSchema,
} from "../Schema/schema";
import { z } from "zod";

export type PostRequestResult = z.infer<typeof ResponseScheme>;
export type TUser = z.infer<typeof UserSchema>;
export type TLogin = z.infer<typeof LoginSchema>;
export type TRegister = z.infer<typeof RegisterSchema>;
export type TGroupCard = z.infer<typeof GroupCardSchema>;
export type TGroup = z.infer<typeof GroupSchema>;
export type TMember = z.infer<typeof MemberSchema>;
export type TExpenseCard = z.infer<typeof ExpenseCardSchema>;
export type TExpense = z.infer<typeof ExpenseSchema>;
export type TPayer = z.infer<typeof PayerSchema>;
export type TExpensePageResponse = z.infer<typeof ExpensePageResponseSchema>;
export type TGetJoinedMembersResponse = z.infer<
  typeof GetJoinedMembersResponseSchema
>;
export type GetJoinGroupDataResponse = z.infer<
  typeof GetJoinGroupDataResponseSchema
>;
export type TPayment = z.infer<typeof PaymentSchema>;
export type TSettlementDataResponse = z.infer<
  typeof SettlementDataResponseSchema
>;

export interface ValidationRule {
  rule: RegExp;
  errorMsg: string;
}

export interface RadioOption {
  label: string;
  value: string | boolean;
}

export interface CreateExpense {
  name: string;
  actualPayer: string;
  amount: number;
  creatorID: string;
  currency: (typeof currency)[number];
  split: boolean;
  payers: TPayer[];
  note: string;
}

export type AggregatedPayment = {
  payerName: string;
  receiverName: string;
  amount: number;
};
