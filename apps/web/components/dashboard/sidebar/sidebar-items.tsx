import { LayoutDashboardIcon,  Store, PackageCheck, Tags, ListTree, TicketPercent, PackageIcon, ShoppingCartIcon, BoxesIcon, TicketPercentIcon, TruckIcon, SettingsIcon } from "lucide-react"

export function adminSibarItems() {
    return [
        {
        title: "Dashboard",
        url: "/dashboard/admin",
        icon: <LayoutDashboardIcon/> 
        },
        {
        title: "Stores",
        url: "#",
        icon: <Store />
        },
        {
        title: "Orders",
        url: "#",
        icon: <PackageCheck />
        },
        {
        title: "Categories",
        url: "/dashboard/admin/categories",
        icon: <Tags />
        },
        {
        title: "Sub-categories",
        url: "/dashboard/admin/sub-categories",
        icon: <ListTree />
        },
        {
        title: "Coupons",
        url: "#",
        icon: <TicketPercent />
        }
    ]
}

export function sellerSidebarItems(storeURL: string) {
    const base = `/dashboard/seller/stores/${storeURL}`;

    return [
        {
        title: "Dashboard",
        url: base,
        icon: <LayoutDashboardIcon />,
        },
        {
        title: "Products",
        url: `${base}/products`,
        icon: <PackageIcon />,
        },
        {
        title: "Orders",
        url: `${base}/orders`,
        icon: <ShoppingCartIcon />,
        },
        {
        title: "Inventory",
        url: `${base}/inventory`,
        icon: <BoxesIcon />,
        },
        {
        title: "Coupons",
        url: `${base}/coupons`,
        icon: <TicketPercentIcon />,
        },
        {
        title: "Shipping",
        url: `${base}/shipping`,
        icon: <TruckIcon />,
        },
        {
        title: "Settings",
        url: `${base}/settings`,
        icon: <SettingsIcon />,
        },
    ];
}