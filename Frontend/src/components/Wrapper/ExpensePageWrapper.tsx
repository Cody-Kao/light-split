import { useExpensePage } from "../../Hooks/hooks";
import { ExpensePageResponseSchema } from "../../Schema/schema";
import { useNavigate, useParams } from "react-router";
import { useLoginContext } from "../../context/LoginContextProvider";
import Skeleton from "../Skeleton";
import ExpensePage from "../Page/ExpensePage";
import { useQueryClient } from "@tanstack/react-query";

export default function ExpensePageWrapper() {
  const { logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params["groupID"];
  const expenseID = params["expenseID"];
  if (!groupID || !expenseID) {
    navigate("/notFound");
    return;
  }
  const queryClient = useQueryClient();
  const { data, isPending } = useExpensePage(
    groupID,
    expenseID,
    ExpensePageResponseSchema,
  );
  if (!data || isPending) {
    return <Skeleton />;
  }
  if (data.type === "Error") {
    queryClient.removeQueries({
      queryKey: ["expensePage", groupID, expenseID],
    });
    throw Error(data.payload.message);
  } else if (data.type === "Logout") {
    logoutUser();
    navigate("/home/login");
    return;
  }
  return <ExpensePage expensePageResponse={data.payload.data} />;
}
