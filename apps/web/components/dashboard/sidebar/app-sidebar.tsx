"use client"

import * as React from "react"
import { NavAdmin } from "@/components/dashboard/sidebar/nav-admin"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useQuery } from "@tanstack/react-query"
import { currentUserClient } from "@/lib/current-user2"
import { NavSeller } from "./nav-seller"
import { CommandIcon } from "lucide-react"
import { adminSibarItems, sellerSidebarItems } from "./sidebar-items"
import { StoreSwitcher } from "./store-switcher"
import { getStores } from "@/lib/store"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  storeURL?: string;
}

export function AppSidebar({ storeURL, ...props }: AppSidebarProps) {
  const { data: user, isLoading, error} = useQuery({
    queryKey: ["current-user"],
    queryFn: currentUserClient
  })

  const { data: stores = [] } = useQuery({
    queryKey: ["seller-stores"],
    queryFn: getStores,
    enabled: user?.role === "SELLER",
  })

  if (error || !user) {
    return null
  }

  const data = {
    user: {
      name: user.username,
      email: user.email,
      image: user.image,
      role: user.role
    },
  }

  return (
    <Sidebar collapsible="icon" {...props}> {/*<Sidebar collapsible="offcanvas" {...props}>*/}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="min-w-8 bg-primary text-primary-foreground rounded-lg duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground">
              <NavUser user={data.user} />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem className="p-1 ">
            {data.user.role === "SELLER" && storeURL  && (
              <StoreSwitcher stores={stores} currentStoreURL={storeURL} />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
         {data.user.role === "ADMIN" && (
          <NavAdmin items={adminSibarItems()} />
        )}


        {data.user.role === "SELLER" && storeURL && (
          <NavSeller items={sellerSidebarItems(storeURL)} />
        )}
      </SidebarContent>
      <SidebarFooter>
        Ecommerce shop
      </SidebarFooter>
    </Sidebar>
  )
}
