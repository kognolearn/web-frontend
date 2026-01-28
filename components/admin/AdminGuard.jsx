"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminGuard({ children }) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Skip guard for sign-in page
    const isSignInPage = pathname === "/admin/sign-in";

    useEffect(() => {
        // Don't check auth on sign-in page
        if (isSignInPage) {
            setLoading(false);
            setIsAdmin(true); // Allow rendering
            return;
        }

        const checkAdmin = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                // Not signed in - redirect to admin sign-in
                if (!session) {
                    router.push("/admin/sign-in");
                    return;
                }

                // Anonymous users - redirect to home
                if (session.user.is_anonymous) {
                    router.push("/");
                    return;
                }

                const { data: adminData, error } = await supabase
                    .from("admins")
                    .select("email")
                    .eq("email", session.user.email)
                    .single();

                if (error || !adminData) {
                    // Signed in but not an admin - redirect to dashboard
                    console.warn("Access denied: User is not an admin.");
                    router.push("/dashboard");
                    return;
                }

                setIsAdmin(true);
            } catch (err) {
                console.error("Error checking admin status:", err);
                router.push("/admin/sign-in");
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [router, isSignInPage]);

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
