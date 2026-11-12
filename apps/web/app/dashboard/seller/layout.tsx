import { ReactNode } from "react";

export default async function SellerDashboardLayout({ children,}: {
  children: ReactNode;
}) {
  // Block non sellers from accessing the seller dashboard
    // const auth = await currentUserServer();
    // if (!auth || auth.user.role !== "SELLER") {
    //   redirect("/");
    // } 

  return <div>{children}</div>;
}