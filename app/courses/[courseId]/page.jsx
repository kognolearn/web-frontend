export default async function CoursePage({ params }) {
  const { courseId } = await params;
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Course Details
        </h1>
        <p className="text-gray-600">
          Course ID: {courseId}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          This page is under construction
        </p>
      </div>
    </div>
  );
}
