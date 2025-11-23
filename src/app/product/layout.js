import DashboardLayout from "../dashboard/layout";

export default function ProductPageLayout({ children }) {
  return <DashboardLayout centerContent={true}>{children}</DashboardLayout>;
}
