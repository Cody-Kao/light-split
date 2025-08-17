import {
  useQuery,
  useMutation,
  useSuspenseQuery,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { GetRequest, PostRequest } from "./queryFuncs";
import type {
  AddMemberRequest,
  CreateGroupRequest,
  DeleteExpenseRequest,
  DeleteGroupRequest,
  DeleteMemberRequest,
  JoinGroupRequest,
  LogoutRequest,
  RegisterRequest,
  SettleGroupRequest,
} from "../type/request";
import { showToast } from "../utils/utils";
import { z } from "zod";
import {
  ChangeProfileImageResponseSchema,
  CreateGroupResponseSchema,
  GetJoinGroupDataResponseSchema,
  SettleGroupResponseSchema,
  SettlementDataResponseSchema,
} from "../Schema/schema";

export const useRegister = () => {
  return useMutation({
    mutationFn: async ({
      data,
      schema,
    }: {
      data: RegisterRequest;
      schema: z.Schema;
    }) => await PostRequest("http://localhost:5000/register", data, schema),
    mutationKey: ["register"], // mutation key is for debugging in devtool to identify mutation instance
    onError: (error) => {
      showToast(error.message);
    },
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ data, schema }: { data: any; schema: z.Schema }) => {
      return await PostRequest("http://localhost:5000/login", data, schema);
    },
    mutationKey: ["login"],
    onError: (error) => {
      showToast(error.message);
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async (data: LogoutRequest) => {
      return await PostRequest("http://localhost:5000/logout", data);
    },
    mutationKey: ["logout"],
    onError: (error) => {
      showToast(`登出失敗: ${error.message}`);
    },
  });
};

export const useCheckLogin = (schema: z.Schema, enabled: boolean) => {
  return useQuery({
    queryFn: async () => {
      return await GetRequest(
        "http://localhost:5000/checkLogin",
        undefined,
        schema,
      );
    },
    queryKey: ["checkLogin"],
    enabled,
  });
};

// 給GroupsWrapper拿最初的groupCards呼叫的
export const useGroups = (schema: z.Schema) => {
  return useSuspenseQuery({
    queryFn: async () => {
      return await GetRequest(
        "http://localhost:5001/paginatedGroups/0",
        undefined,
        schema,
      );
    },
    queryKey: ["initialize groups"],
    staleTime: 1000 * 60 * 5,
  });
};
// 後續載入更多groupCards
export const usePaginatedGroups = (schema: z.Schema, initialData?: any) => {
  return useInfiniteQuery({
    // pageParam is a variable automatically generated for offset
    queryFn: async ({ pageParam }) => {
      return await GetRequest(
        `http://localhost:5001/paginatedGroups/${pageParam}`,
        undefined,
        schema,
      );
    },
    queryKey: ["paginatedGroups"],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.payload.data.haveMore ? allPages.length : undefined,
    initialData,
    //enabled: false, // so that the query won't fire on mounts; but it needs to have an initialData
    staleTime: 0,
    refetchOnMount: true, // <-- ensures refetch on remount
  });
};

export const useGroup = (groupID: string, schema: z.Schema) => {
  return useSuspenseQuery({
    queryFn: async () => {
      return GetRequest(
        `http://localhost:5001/group/${groupID}`,
        undefined,
        schema,
      );
    },
    queryKey: ["group", groupID],
  });
};

export const usePaginatedExpenses = (groupID: string, schema: z.Schema) => {
  return useInfiniteQuery({
    queryFn: async ({ pageParam }) => {
      return await GetRequest(
        `http://localhost:5002/group/${groupID}/expenses/${pageParam}`,
        undefined,
        schema,
      );
    },
    queryKey: ["paginatedExpenses", groupID],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.payload.data.haveMore ? allPages.length : undefined,
  });
};

// Member
export const useMembersQuery = (groupID: string, schema: z.Schema) => {
  return useQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5001/group/${groupID}/members`,
        undefined,
        schema,
      );
    },
    queryKey: ["members", groupID],
    staleTime: Infinity,
  });
};

export const useExpensePage = (
  groupID: string,
  expenseID: string,
  schema: z.Schema,
) => {
  return useQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5002/group/${groupID}/expense/${expenseID}`,
        undefined,
        schema,
      );
    },
    queryKey: ["expensePage", groupID, expenseID],
  });
};

export const useDeleteMember = () => {
  return useMutation({
    mutationFn: (data: DeleteMemberRequest) => {
      return PostRequest("http://localhost:5001/deleteMember", data);
    },
    mutationKey: ["deleteMember"],
    onError: (error) => {
      showToast(`刪除成員失敗: ${error.message}`);
    },
  });
};

export const useDeleteExpense = () => {
  return useMutation({
    mutationFn: (data: DeleteExpenseRequest) => {
      return PostRequest("http://localhost:5002/deleteExpense", data);
    },
    mutationKey: ["deleteExpense"],
    onError: (error) => {
      showToast(`刪除花費失敗: ${error.message}`);
    },
  });
};

export const useCreateGroup = () => {
  return useMutation({
    mutationFn: (data: CreateGroupRequest) => {
      return PostRequest(
        "http://localhost:5001/createGroup",
        data,
        CreateGroupResponseSchema,
      );
    },
    mutationKey: ["createGroup"],
    onError: (error) => {
      showToast(`創建群組失敗: ${error.message}`);
    },
  });
};

export const useAddMember = () => {
  return useMutation({
    mutationFn: (data: AddMemberRequest) => {
      return PostRequest("http://localhost:5001/addMembers", data);
    },
    mutationKey: ["addMember"],
    onError: (error) => {
      showToast(`新增成員失敗: ${error.message}`);
    },
  });
};

export const useDeleteGroup = () => {
  return useMutation({
    mutationFn: (data: DeleteGroupRequest) => {
      return PostRequest("http://localhost:5001/deleteGroup", data);
    },
    mutationKey: ["deleteGroup"],
    onError: (error) => {
      showToast(`刪除群組失敗: ${error.message}`);
    },
  });
};

export const useGetJoinedMembers = (groupID: string, schema: z.Schema) => {
  return useSuspenseQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5001/group/${groupID}/joinedMembers`,
        undefined,
        schema,
      );
    },
    queryKey: ["getJoinedMembers", groupID],
  });
};

export const useCreateExpense = () => {
  return useMutation({
    mutationFn: (data: FormData) => {
      return PostRequest(
        "http://localhost:5002/createExpense",
        data,
        z.string(),
        true,
      );
    },
    mutationKey: ["createExpense"],
    onError: (error) => {
      showToast(`新增預算失敗: ${error.message}`);
    },
  });
};

export const useUpdateExpense = () => {
  return useMutation({
    mutationFn: (data: FormData) => {
      return PostRequest(
        "http://localhost:5002/updateExpense",
        data,
        undefined,
        true,
      );
    },
    mutationKey: ["updateExpense"],
    onError: (error) => {
      showToast(`更新預算失敗: ${error.message}`);
    },
  });
};

export const useGetJoinGroupLink = (
  userID: string,
  groupID: string,
  schema: z.Schema,
) => {
  return useQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5001/getJoinGroupLink?userID=${userID}&groupID=${groupID}`,
        undefined,
        schema,
      );
    },
    queryKey: ["getJoinGroupLink", groupID],
    staleTime: Infinity,
  });
};

export const useJoinGroup = () => {
  return useMutation({
    mutationFn: (data: JoinGroupRequest) => {
      return PostRequest("http://localhost:5001/joinGroup", data, z.string());
    },
    mutationKey: ["useJoinGroup"],
    onError: (error) => {
      showToast(`加入群組失敗: ${error.message}`);
    },
  });
};

export const useGetJoinGroupData = (
  OpenGroupID: string,
  groupID: string,
  userID: string,
  enabled: boolean,
) => {
  return useQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5001/getJoinGroupData/${OpenGroupID}/${groupID}/${userID}`,
        undefined,
        GetJoinGroupDataResponseSchema,
      );
    },
    queryKey: ["useGetJoinGroupData"],
    enabled,
  });
};

export const useSettlement = (groupID: string) => {
  return useSuspenseQuery({
    queryFn: async () => {
      return await GetRequest(
        `http://localhost:5001/group/${groupID}/settlement`,
        undefined,
        SettlementDataResponseSchema,
      );
    },
    queryKey: ["useSettlement", groupID],
    refetchOnWindowFocus: false,
  });
};

export const useChangeProfileImage = () => {
  return useMutation({
    mutationFn: (data: FormData) => {
      return PostRequest(
        "http://localhost:5002/changeProfileImage",
        data,
        ChangeProfileImageResponseSchema,
        true,
      );
    },
    mutationKey: ["useChangeProfileImage"],
    onError: (error) => {
      showToast(`上傳使用者頭像失敗: ${error.message}`);
    },
  });
};

export const useSettleGroup = () => {
  return useMutation({
    mutationFn: (data: SettleGroupRequest) => {
      return PostRequest(
        "http://localhost:5001/settleGroup",
        data,
        SettleGroupResponseSchema,
      );
    },
    mutationKey: ["useSettleGroup"],
    onError: (error) => {
      showToast(`核銷群組失敗: ${error.message}`);
    },
  });
};
