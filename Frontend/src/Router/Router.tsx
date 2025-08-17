import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
} from "react-router";
import App from "../App";
import NotFound from "../components/Page/NotFound";
import UserPage from "../components/Page/UserPage";
import LoginAndRegisterPage from "../components/Page/LoginAndRegisterPage";
import QueryWrapper from "../components/Wrapper/QueryWrapper";
import GroupsWrapper from "../components/Wrapper/GroupsWrapper";
import GroupWrapper from "../components/Wrapper/GroupWrapper";
import ExpensePageWrapper from "../components/Wrapper/ExpensePageWrapper";
import AddExpenseWrapper from "../components/Wrapper/AddExpenseWrapper";
import JoinGroup from "../components/Page/JoinGroup";
import SettlementWrapper from "../components/Wrapper/SettlementWrapper";
import LandingPage from "../components/Page/LandingPage";

export const Router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<App />}>
        <Route
          index
          element={
            <QueryWrapper>
              <GroupsWrapper />
            </QueryWrapper>
          }
        />
        <Route
          path="group/:groupID"
          element={
            <QueryWrapper>
              <GroupWrapper />
            </QueryWrapper>
          }
        />
        <Route
          path="group/:groupID/addExpense"
          element={
            <QueryWrapper>
              <AddExpenseWrapper />
            </QueryWrapper>
          }
        />
        <Route
          path="group/:groupID/expense/:expenseID"
          element={
            <QueryWrapper>
              <ExpensePageWrapper />
            </QueryWrapper>
          }
        />
        <Route path="user" element={<UserPage />} />
        <Route path="login" element={<LoginAndRegisterPage />} />
        <Route path="join/:openGroupID/:groupID" element={<JoinGroup />} />
        <Route
          path="group/:groupID/settlement"
          element={<SettlementWrapper />}
        />
      </Route>
      <Route path="*" element={<NotFound />} />,
    </>,
  ),
);
