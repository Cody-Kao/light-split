import { useGetJoinedMembers } from "../../Hooks/hooks";
import { GetJoinedMembersResponseSchema } from "../../Schema/schema";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate, useParams } from "react-router";
import AddExpense from "../Page/AddExpense";
import { useQueryClient } from "@tanstack/react-query";

export default function AddExpenseWrapper() {
  const { logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params.groupID;
  if (!groupID) {
    navigate("/notFound");
    return;
  }

  const queryClient = useQueryClient();
  const { data } = useGetJoinedMembers(groupID, GetJoinedMembersResponseSchema);
  if (data.type === "Error") {
    queryClient.removeQueries({
      queryKey: ["getJoinedMembers", groupID],
    });
    throw Error(data.payload.message);
  } else if (data.type === "Logout") {
    logoutUser();
    navigate("/home/login");
    return;
  }

  const response = data.payload.data;
  return <AddExpense response={response} />;
}
