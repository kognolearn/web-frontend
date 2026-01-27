import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const formData = await request.formData();

    // Text-based inputs
    const studentText = formData.get("student_answers");
    const referenceText = formData.get("solutions_text");
    const referenceFile = formData.get("solutions_file") || formData.get("reference_file");

    // File-based inputs (support both old and new field names)
    const submissionFile =
      formData.get("student_submission_pdf") || formData.get("submission_file");
    const combinedFile = formData.get("combined_pdf") || formData.get("combined_file");

    // Determine input mode
    const hasTextInput = Boolean(studentText);
    const hasFileInput = Boolean(submissionFile);
    const hasCombined = Boolean(combinedFile);

    // Validate: must have at least one input
    if (!hasTextInput && !hasFileInput && !hasCombined) {
      return NextResponse.json(
        { error: "Provide student_answers (text), submission_file, or combined_file" },
        { status: 400 }
      );
    }

    // Build FormData for backend
    const backendFormData = new FormData();

    if (hasTextInput) {
      // Text-based mode
      backendFormData.append("student_answers", studentText);

      if (referenceText) {
        backendFormData.append("solutions_text", referenceText);
      }
      if (referenceFile) {
        backendFormData.append("reference_file", referenceFile);
      }
    } else if (hasCombined) {
      // Combined file mode
      backendFormData.append("combined_file", combinedFile);
    } else if (hasFileInput) {
      // Submission file mode (with optional reference)
      backendFormData.append("submission_file", submissionFile);

      if (referenceText) {
        backendFormData.append("solutions_text", referenceText);
      }
      if (referenceFile) {
        backendFormData.append("reference_file", referenceFile);
      }
    }

    const headers = {};
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${BASE_URL}/courses/${courseId}/grade-ad-hoc`, {
      method: "POST",
      headers,
      body: backendFormData,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Ad-hoc grading error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
