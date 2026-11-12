import { AppSidebar } from "@/components/dashboard/sidebar/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { currentUserServer } from "@/lib/current-user"
import { redirect } from "next/navigation"
import { ReactNode } from "react"

interface SellerStoreDashboardLayoutProps { children: ReactNode; params: Promise<{storeURL: string }>}

export default async function SellerStoreDashboardLayout({children, params}: SellerStoreDashboardLayoutProps) {
  const user = await currentUserServer();
  if (!user || user.role !== "SELLER") redirect("/");

  const { storeURL } = await params
  
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar storeURL={storeURL}/> {/*<AppSidebar variant="inset" /> */}
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
