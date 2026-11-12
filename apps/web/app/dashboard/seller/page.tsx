import { redirect } from "next/navigation";
import { currentUserServer } from "@/lib/current-user";

export default async function SellerDashboardPage() {
  const user = await currentUserServer();
  
    if (!user) {
      redirect("/sign-in");
    }
  
    switch (user.role) {
      case "ADMIN":
        redirect("/dashboard/admin");
  
      case "SELLER":
        redirect(user.store?.url ? `/dashboard/seller/stores/${user.store.url}`: "/dashboard/seller/stores/new");
  
      default:
        redirect("/");
    }
}