import { useGroups } from "../../Hooks/hooks";
import { GroupsResponseSchema } from "../../Schema/schema";
import Groups from "../Page/Groups";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
export default function GroupsWrapper() {
  const { logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useGroups(GroupsResponseSchema);
  console.log("data:", data);
  if (data.type === "Error") {
    queryClient.removeQueries({ queryKey: ["initialize groups"] });
    queryClient.removeQueries({ queryKey: ["paginatedGroups"] });
    throw Error(data.payload.message);
  } else if (data.type === "Logout") {
    logoutUser();
  }
  const { groupCards, haveMore } = data.payload.data;
  queryClient.setQueryData(["paginatedGroups"], {
    pages: [
      {
        payload: {
          data: {
            groupCards: groupCards,
            haveMore: haveMore,
          },
        },
      },
    ],
    pageParams: [0],
  });
  console.log(groupCards, haveMore);
  useEffect(() => {
    if (data.type === "Logout") {
      navigate("/home/login");
    }
  }, [data]);
  return <Groups groupCardsDate={groupCards} haveMoreCards={haveMore} />;
}
