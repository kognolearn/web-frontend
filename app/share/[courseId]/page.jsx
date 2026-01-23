import ShareCourseClient from "./ShareCourseClient";

export async function generateMetadata({ params }) {
  const { courseId } = await params;

  return {
    title: "Shared Course",
    description: "Someone shared a course with you. Review and load it to your account.",
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: "Shared Course | Kogno",
      description: "Someone shared a course with you on Kogno. Join to start learning together.",
    },
  };
}

export default function ShareCoursePage() {
  return <ShareCourseClient />;
}
