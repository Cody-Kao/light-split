import { useNavigate, useParams } from "react-router";
import { useSettlement } from "../../Hooks/hooks";
import { useLoginContext } from "../../context/LoginContextProvider";
import Settlement from "../Page/Settlement";
import { useQueryClient } from "@tanstack/react-query";

export default function SettlementWrapper() {
  const { logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params["groupID"];
  if (!groupID) {
    navigate("/notFound");
    return;
  }

  const queryClient = useQueryClient();
  const { data, refetch, isFetching } = useSettlement(groupID);
  const refetchFunction = () => refetch();
  if (data.type === "Error") {
    queryClient.removeQueries({
      queryKey: ["useSettlement", groupID],
    });
    throw Error(data.payload.message);
  } else if (data.type === "Logout") {
    logoutUser();
    navigate("/home/login");
    return;
  }
  const response = data.payload.data;
  return (
    <Settlement
      settlement={response}
      refetchFunction={refetchFunction}
      isFetching={isFetching}
    />
  );
}
