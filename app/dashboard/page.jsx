"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import CreateCourseCard from "@/components/courses/CreateCourseCard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async (userId) => {
    try {
      const res = await fetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        console.error("Failed to fetch courses from API", res.status);
        setCourses([]);
      } else {
        const body = await res.json();
        const items = Array.isArray(body?.courses) ? body.courses : [];
        setCourses(items);
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    const loadUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/signup");
        return;
      }

      setUser(user);
      await loadCourses(user.id);

      setLoading(false);
    };

    loadUserAndCourses();
  }, [router, loadCourses]);

  // Listen for course updates triggered elsewhere (e.g., CreateCourseCard/Modal)
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      setLoading(true);
      loadCourses(user.id).finally(() => setLoading(false));
    };
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, [user, loadCourses]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Ed Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            My Courses
          </h2>
          <p className="text-gray-600">
            {courses.length === 0
              ? "You haven't created any courses yet. Get started by creating your first course!"
              : `You have ${courses.length} course${courses.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => {
            const created = course.created_at ? new Date(course.created_at) : null;
            const when = created ? created.toLocaleString() : "Unknown date";
            return (
              <CourseCard
                key={course.id}
                courseCode={"Generated Course"}
                courseName={`Created ${when}`}
                courseId={course.id}
              />
            );
          })}
          
          {/* Create New Course Card */}
          <CreateCourseCard />
        </div>
      </div>
    </div>
  );
}
