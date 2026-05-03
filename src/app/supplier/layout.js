import DashboardLayout from "../dashboard/layout";

export default function SupplierPageLayout({ children }) {
  return <DashboardLayout centerContent={true}>{children}</DashboardLayout>;
}
