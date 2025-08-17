import { useGroup } from "../../Hooks/hooks";
import { GroupSchema } from "../../Schema/schema";
import GroupPage from "../Page/GroupPage";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupWrapper() {
  const { logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params.groupID;
  console.log(groupID);
  if (!groupID) {
    navigate("/notFound");
    return;
  }

  const queryClient = useQueryClient();
  const { data } = useGroup(groupID, GroupSchema);
  if (data.type === "Error") {
    queryClient.removeQueries({
      queryKey: ["group", groupID],
    });
    throw Error(data.payload.message);
  } else if (data.type === "Logout") {
    logoutUser();
    navigate("/home/login");
    return;
  }

  const group = data.payload.data;
  return <GroupPage group={group} />;
}
