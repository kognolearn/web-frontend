"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import { useTheme } from "@/components/theme/ThemeProvider";
import { isDesktopApp } from "@/lib/platform";
import { isDownloadRedirectEnabled } from "@/lib/featureFlags";

export default function SettingsPage() {
  const router = useRouter();
  const { themeMode, setThemeMode, mounted } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPlanLoading, setAdminPlanLoading] = useState(false);

  // Course creation UI preference
  const [courseCreateUiMode, setCourseCreateUiMode] = useState("chat");

  // Cosmetics state
  const [cosmetics, setCosmetics] = useState([]);
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);
  const [customThemeColor, setCustomThemeColor] = useState("#6366f1");
  const forceDownloadRedirect = isDownloadRedirectEnabled();

  // Redirect web users to download page (backup guard - middleware handles this primarily)
  useEffect(() => {
    if (forceDownloadRedirect && !isDesktopApp()) {
      router.replace('/download');
    }
  }, [forceDownloadRedirect, router]);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in?redirect=/settings");
        return;
      }
      setUser(user);
      setFullName(user.user_metadata?.full_name || "");
      setSchool(user.user_metadata?.school || "");

      // Fetch subscription status
      try {
        const res = await authFetch("/api/stripe?endpoint=subscription-status");
        if (res.ok) {
          const data = await res.json();
          setSubscriptionStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch subscription status:", err);
      }

      // Check admin status
      try {
        const res = await authFetch("/api/admin/status");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin === true);
        }
      } catch (err) {
        // Not an admin or error - that's fine
      }

      // Fetch cosmetics
      try {
        const res = await authFetch("/api/store?endpoint=cosmetics");
        if (res.ok) {
          const data = await res.json();
          setCosmetics(data.cosmetics || []);
          // Set custom theme color if user has one
          const customTheme = data.cosmetics?.find(c => c.cosmetic_type === "custom_theme");
          if (customTheme?.cosmetic_data?.accent_color) {
            setCustomThemeColor(customTheme.cosmetic_data.accent_color);
          }
        }
      } catch (err) {
        console.error("Failed to fetch cosmetics:", err);
      }

      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load course creation UI preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kogno_course_create_ui_mode');
      if (saved) setCourseCreateUiMode(saved);
    }
  }, []);

  // Save course creation UI preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kogno_course_create_ui_mode', courseCreateUiMode);
    }
  }, [courseCreateUiMode]);

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          school: school.trim(),
        }
      });

      if (updateError) throw updateError;
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      setProfileError(e.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setPasswordError("New password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password");
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (e) {
      setPasswordError(e.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setSubscriptionError(null);

    try {
      const res = await authFetch("/api/stripe?endpoint=create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.location.href = data.url;
    } catch (err) {
      setSubscriptionError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

<<<<<<< HEAD
  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setSubscriptionError(null);

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/checkout/success?source=settings`;
      const cancelUrl = `${origin}/settings?checkout=cancelled`;

      const res = await authFetch("/api/stripe?endpoint=create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "monthly",
          flow: "hosted",
          successUrl,
          cancelUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || data?.details || "Failed to open checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      setSubscriptionError(err.message || "Failed to open checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

=======
>>>>>>> origin/main
  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (newPassword.length >= 12) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength <= 2) return { strength: 1, label: "Weak", color: "bg-red-500" };
    if (strength <= 4) return { strength: 2, label: "Medium", color: "bg-[var(--muted-foreground)]" };
    return { strength: 3, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength();

  const appearanceOptions = [
    {
      id: "system",
      label: "System",
      description: "Match your device",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "light",
      label: "Light",
      description: "Always light",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05 4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
    },
    {
      id: "dark",
      label: "Dark",
      description: "Always dark",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ),
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeLeftLabel = (dateStr) => {
    if (!dateStr) return "TBD";
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.ceil(diffMs / minuteMs));
      return `${minutes} min${minutes === 1 ? "" : "s"} left`;
    }

    if (diffMs < dayMs) {
      const hours = Math.ceil(diffMs / hourMs);
      return `${hours} hour${hours === 1 ? "" : "s"} left`;
    }

    const days = Math.ceil(diffMs / dayMs);
    return `${days} day${days === 1 ? "" : "s"} left`;
  };

  const getProductLabel = (productType) => {
    switch (productType) {
      case "monthly": return "Monthly Plan";
      case "3month": return "3 Month Plan";
      case "2week_deal": return "2 Week Access";
      default: return productType;
    }
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const { hasSubscription, subscription, planLevel, trialEndsAt } = subscriptionStatus || {};
  const hasPaidAccess = planLevel === "paid";
  const isTrialAccess = hasPaidAccess && !hasSubscription;

  const handleTogglePlanLevel = async () => {
    setAdminPlanLoading(true);
    const newPlanLevel = hasPaidAccess ? "free" : "paid";

    try {
      const res = await authFetch("/api/admin/my-plan-level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planLevel: newPlanLevel }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update plan level");
      }

      // Refresh subscription status to reflect the change
      const statusRes = await authFetch("/api/stripe?endpoint=subscription-status");
      if (statusRes.ok) {
        const data = await statusRes.json();
        setSubscriptionStatus(data);
      }
    } catch (err) {
      console.error("Failed to toggle plan level:", err);
    } finally {
      setAdminPlanLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      // Call backend to delete account and all user data
      const res = await authFetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "ACTIVE_SUBSCRIPTION") {
          throw new Error("You must cancel your subscription before deleting your account. Go to the Subscription section above to manage your subscription.");
        }
        throw new Error(data.error || "Failed to delete account");
      }

      // Clear all localStorage data related to user session
      try {
        localStorage.removeItem("kogno_onboarding_session_v1");
        localStorage.removeItem("kogno_anon_user_id");
        localStorage.removeItem("kogno_onboarding_dismissed");
        localStorage.removeItem("kogno_tour_state");
        sessionStorage.removeItem("kogno_onboarding_tab");
      } catch (e) {
        console.warn("Failed to clear local storage:", e);
      }

      // Sign out and redirect to home
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Please contact support.");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-1)]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--surface-muted)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Settings</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Manage your account</p>
              </div>
            </div>
            <Link href="/" className="flex items-center">
              <Image
                src="/images/kogno_logo.png"
                alt="Kogno Logo"
                width={32}
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
              />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Section */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Your personal information</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="block text-sm font-medium">School / University</label>
                <input
                  type="text"
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Enter your school"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Email</label>
              <div className="px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--muted-foreground)]">
                {user?.email}
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Profile updated successfully!
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Password Section */}
            <div className="pt-5 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                    <svg className="h-4 w-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Change Password</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Update your account password</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPasswordSection && (
                <div className="mt-4 space-y-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showCurrentPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showNewPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                passwordStrength.strength >= level ? passwordStrength.color : 'bg-[var(--border)]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${
                          passwordStrength.strength === 1 ? 'text-red-500' :
                          passwordStrength.strength === 2 ? 'text-[var(--muted-foreground)]' : 'text-green-500'
                        }`}>
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showConfirmPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {confirmPassword && (
                      <p className={`text-xs flex items-center gap-1 ${
                        newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                      Password updated successfully!
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Appearance</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Customize how Kogno looks</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {appearanceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setThemeMode(option.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                    themeMode === option.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]/50"
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                    themeMode === option.id
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                  }`}>
                    {option.icon}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${
                      themeMode === option.id ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Cosmetics Section */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
<<<<<<< HEAD
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
=======
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
>>>>>>> origin/main
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cosmetics</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Customize your profile with items from the store</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Profile Flair */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[var(--foreground)]">Profile Flair</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">A special badge displayed on your profile</p>
                </div>
                {cosmetics.find(c => c.cosmetic_type === "profile_flair") ? (
                  <div className="flex items-center gap-2">
<<<<<<< HEAD
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold">
=======
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold">
>>>>>>> origin/main
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Supporter
                    </span>
                    <span className="text-xs text-green-500 font-medium">Equipped</span>
                  </div>
                ) : (
                  <Link
                    href="/store"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    Get from Store
                  </Link>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Custom Theme */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[var(--foreground)]">Custom Theme</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Personalize your accent color</p>
                </div>
                {!cosmetics.find(c => c.cosmetic_type === "custom_theme") && (
                  <Link
                    href="/store"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    Get from Store
                  </Link>
                )}
              </div>
              {cosmetics.find(c => c.cosmetic_type === "custom_theme") && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--muted-foreground)]">Accent Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customThemeColor}
                        onChange={(e) => setCustomThemeColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
                      />
                      <span className="text-sm font-mono text-[var(--muted-foreground)]">{customThemeColor}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setCosmeticsLoading(true);
                      try {
                        const res = await authFetch("/api/store?endpoint=cosmetics/custom_theme/color", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ accentColor: customThemeColor }),
                        });
                        if (res.ok) {
                          // Refresh cosmetics
                          const cosmeticsRes = await authFetch("/api/store?endpoint=cosmetics");
                          if (cosmeticsRes.ok) {
                            const data = await cosmeticsRes.json();
                            setCosmetics(data.cosmetics || []);
                          }
                        }
                      } catch (err) {
                        console.error("Failed to update theme color:", err);
                      } finally {
                        setCosmeticsLoading(false);
                      }
                    }}
                    disabled={cosmeticsLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                  >
                    {cosmeticsLoading ? "Saving..." : "Save Color"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Course Creation Section */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Course Creation</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Choose your preferred course setup experience</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCourseCreateUiMode("chat")}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  courseCreateUiMode === "chat"
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]/50"
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
                  courseCreateUiMode === "chat"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${
                    courseCreateUiMode === "chat" ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}>
                    Chat Mode
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Conversational setup guided by Kogno step-by-step
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCourseCreateUiMode("wizard")}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  courseCreateUiMode === "wizard"
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]/50"
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
                  courseCreateUiMode === "wizard"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${
                    courseCreateUiMode === "wizard" ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}>
                    Wizard Mode
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Classic form-based wizard with all options visible
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Subscription & Billing</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Manage your plan and payment</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {subscriptionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {subscriptionError}
              </div>
            )}

            {hasSubscription ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Premium</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {getProductLabel(subscription?.productType)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <p className="text-sm text-[var(--muted-foreground)]">Plan</p>
                    <p className="text-base font-medium">{getProductLabel(subscription?.productType)}</p>
                  </div>

                  {subscription?.productType !== "2week_deal" ? (
                    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {subscription?.cancelAtPeriodEnd ? "Ends on" : "Renews on"}
                      </p>
                      <p className="text-base font-medium">
                        {subscription?.cancelAtPeriodEnd
                          ? formatDate(subscription?.currentPeriodEnd)
                          : formatDate(subscription?.currentPeriodEnd)}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                      <p className="text-sm text-[var(--muted-foreground)]">Access expires</p>
                      <p className="text-base font-medium">{formatDate(subscription?.currentPeriodEnd)}</p>
                    </div>
                  )}
                </div>

                {subscription?.cancelAtPeriodEnd && (
                  <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl">
                    <p className="text-sm text-[var(--primary)]">
                      Your subscription will end on {formatDate(subscription?.currentPeriodEnd)}.
                      You can reactivate it from the billing portal below.
                    </p>
                  </div>
                )}

                {subscription?.productType !== "2week_deal" && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {portalLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Manage Subscription
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : isTrialAccess ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Free Trial</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Full Pro access until {trialEndsAt ? formatDate(trialEndsAt) : "the end of your trial"}.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <p className="text-sm text-[var(--muted-foreground)]">Trial ends</p>
                  <p className="text-base font-medium">{trialEndsAt ? formatDate(trialEndsAt) : "TBD"}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">Time left</p>
                  <p className="text-base font-medium">{getTimeLeftLabel(trialEndsAt)}</p>
                </div>

                <button
<<<<<<< HEAD
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
=======
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {portalLoading ? (
>>>>>>> origin/main
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
<<<<<<< HEAD
                      Opening Checkout...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
                      </svg>
                      Upgrade to Premium
=======
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Open Billing Portal
>>>>>>> origin/main
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1">Free Tier</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-6">
                  You're on the free tier with limited access.
                </p>
                <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Free tier includes: 1 course, 2 midterms, 2 finals, and 1 cheatsheet per course.
                  </p>
                </div>
                <button
<<<<<<< HEAD
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {checkoutLoading ? (
=======
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? (
>>>>>>> origin/main
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
<<<<<<< HEAD
                      Opening Checkout...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
                      </svg>
                      Upgrade to Premium
=======
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Open Billing Portal
>>>>>>> origin/main
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Admin Tools Section - Only visible to admins */}
        {isAdmin && (
          <section className="bg-[var(--surface-1)] rounded-2xl border border-purple-500/30 overflow-hidden">
            <div className="px-6 py-5 border-b border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-purple-500">Admin Tools</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Testing and development options</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    hasPaidAccess ? "bg-green-500/20" : "bg-[var(--surface-muted)]"
                  }`}>
                    <svg className={`w-5 h-5 ${hasPaidAccess ? "text-green-500" : "text-[var(--muted-foreground)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Plan Level Override</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Currently: <span className={hasPaidAccess ? "text-green-500 font-medium" : "text-[var(--muted-foreground)]"}>
                        {hasPaidAccess ? "Pro" : "Free"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTogglePlanLevel}
                  disabled={adminPlanLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    hasPaidAccess
                      ? "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {adminPlanLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </span>
                  ) : hasPaidAccess ? (
                    "Switch to Free"
                  ) : (
                    "Switch to Pro"
                  )}
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                This actually updates your plan level in the database for testing purposes.
              </p>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="bg-[var(--surface-1)] rounded-2xl border border-red-500/30 overflow-hidden">
          <div className="px-6 py-5 border-b border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Irreversible actions</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleteLoading) {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
                setDeleteError(null);
              }
            }}
          />
          <div className="relative w-full max-w-md bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-500">Delete Account</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">
                  This will permanently delete your account and all associated data including:
                </p>
                <ul className="mt-2 text-sm text-red-400 list-disc list-inside space-y-1">
                  <li>All your courses and progress</li>
                  <li>Flashcards, quizzes, and study materials</li>
                  <li>Your subscription (if active)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Type <span className="font-mono text-red-500">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  disabled={deleteLoading}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all disabled:opacity-50"
                />
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--border)] flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </span>
                ) : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
