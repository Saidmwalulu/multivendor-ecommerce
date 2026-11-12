"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronsUpDown, Store as StoreIcon, Check } from "lucide-react"
import Image from "next/image"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Store } from "@/lib/store"

interface StoreSwitcherProps {
  stores: Store[]
  currentStoreURL: string
}

export function StoreSwitcher({ stores, currentStoreURL }: StoreSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useSidebar()

  const activeStore =
    stores.find((store) => store.url === currentStoreURL) ?? stores[0]

  if (!activeStore) return null

  function handleSelect(store: Store) {
    if (store.url === currentStoreURL) return

    const segments = pathname.split("/")
    const storeIndex = segments.findIndex((seg) => seg === currentStoreURL)

    if (storeIndex !== -1) {
      segments[storeIndex] = store.url
      router.push(segments.join("/"))
    } else {
      router.push(`/seller/${store.url}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            {activeStore.logo ? (
              <Image
                src={activeStore.logo}
                alt={activeStore.name}
                width={32}
                height={32}
                className="size-full object-cover"
              />
            ) : (
              <StoreIcon className="size-4" />
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{activeStore.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {activeStore.url}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Stores
        </DropdownMenuLabel>
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => handleSelect(store)}
            className="gap-2 p-2"
          >
            <div className="flex size-6 items-center justify-center overflow-hidden rounded-md border">
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={24}
                  height={24}
                  className="size-full object-cover"
                />
              ) : (
                <StoreIcon className="size-3.5 shrink-0" />
              )}
            </div>
            {store.name}
            {store.url === activeStore.url && (
              <Check className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}