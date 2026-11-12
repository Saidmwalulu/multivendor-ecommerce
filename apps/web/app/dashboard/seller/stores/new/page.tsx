"use client"

import StoreForm from "@/components/dashboard/forms/store-details";
import { useRouter } from "next/navigation";

export default function SellerNewStorePage() {
    const router = useRouter();
    
    return (
        <div>
            <StoreForm mode="create" onSuccess={(data) => router.push(`/dashboard/seller/stores/${data.url}`)} />
        </div>
    )
}