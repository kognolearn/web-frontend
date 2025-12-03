"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminGuard({ children }) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session) {
                    router.push("/login"); // Or wherever you want to redirect unauthenticated users
                    return;
                }

                const { data: adminData, error } = await supabase
                    .from("admins")
                    .select("email")
                    .eq("email", session.user.email)
                    .single();

                if (error || !adminData) {
                    console.warn("Access denied: User is not an admin.");
                    router.push("/"); // Redirect non-admins to home
                    return;
                }

                setIsAdmin(true);
            } catch (err) {
                console.error("Error checking admin status:", err);
                router.push("/");
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                    <p className="text-sm text-gray-500">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Router will redirect, so render nothing
    }

    return <>{children}</>;
}
