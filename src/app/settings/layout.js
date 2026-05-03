import DashboardLayout from "../dashboard/layout";

export default function SettingsLayout({ children }) {
  return <DashboardLayout centerContent={true}>{children}</DashboardLayout>;
}
