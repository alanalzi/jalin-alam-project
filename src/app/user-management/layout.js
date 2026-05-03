import DashboardLayout from "../dashboard/layout";

export default function UserManagementPageLayout({ children }) {
  return <DashboardLayout centerContent={true}>{children}</DashboardLayout>;
}
