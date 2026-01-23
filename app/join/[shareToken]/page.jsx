import JoinCourseClient from "./JoinCourseClient";

export async function generateMetadata({ params }) {
  const { shareToken } = await params;

  return {
    title: "Join Study Group",
    description: "You've been invited to join a course and study group on Kogno.",
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: "Join Study Group | Kogno",
      description: "You've been invited to join a course and study group on Kogno.",
    },
  };
}

export default function JoinCoursePage() {
  return <JoinCourseClient />;
}
