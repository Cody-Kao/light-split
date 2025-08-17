import type { CreateExpense, TMember, TPayer } from "./type";
import type { currency } from "../const/const";

export interface RegisterRequest {
  name: string;
  account: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LogoutRequest {
  userID: string;
}

export interface DeleteMemberRequest {
  userID: string;
  groupID: string;
  memberID: string;
}

export interface DeleteExpenseRequest {
  userID: string;
  groupID: string;
  expenseID: string;
}

export interface CreateGroup {
  name: string;
  creatorName: string;
  members: TMember[];
}
export interface CreateGroupRequest {
  userID: string;
  group: CreateGroup;
}

export interface AddMember {
  name: string;
}
export interface AddMemberRequest {
  userID: string;
  groupID: string;
  members: AddMember[];
}

export interface DeleteGroupRequest {
  userID: string;
  groupID: string;
}

export interface CreateExpenseRequest {
  userID: string;
  groupID: string;
  expense: CreateExpense;
}

export interface ExpenseUpdateRequest {
  userID: string;
  groupID: string;
  expenseID: string;
  expenseName?: string;
  amount?: number;
  actualPayerID?: string;
  currency?: (typeof currency)[number];
  split: boolean;
  note?: string;
  remove: string[];
  add: TPayer[];
  update: Partial<TPayer>[];
}

export interface GetJoinGroupLink {
  userID: string;
  groupID: string;
}

export interface JoinGroupRequest {
  id: string; // id of the document in OpenGroups
  userID: string;
  groupID: string;
  memberID: string;
}

export interface ChangeProfileImageRequest {
  userID: string;
}

export interface SettleGroupRequest {
  userID: string;
  groupID: string;
}
