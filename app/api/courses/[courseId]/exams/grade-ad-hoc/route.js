import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const formData = await request.formData();

    const blankExam = formData.get("blank_exam_pdf");
    const studentSubmission = formData.get("student_submission_pdf");
    const combined = formData.get("combined_pdf");

    const hasCombined = Boolean(combined);
    const hasSplit = Boolean(blankExam) && Boolean(studentSubmission);

    if (!hasCombined && !hasSplit) {
      return NextResponse.json(
        { error: "Provide either combined_pdf or both blank_exam_pdf and student_submission_pdf" },
        { status: 400 }
      );
    }

    if (hasCombined && (blankExam || studentSubmission)) {
      return NextResponse.json(
        { error: "Provide either combined_pdf or blank_exam_pdf + student_submission_pdf, not both" },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    if (hasCombined) {
      backendFormData.append("combined_pdf", combined);
    } else {
      backendFormData.append("blank_exam_pdf", blankExam);
      backendFormData.append("student_submission_pdf", studentSubmission);
    }

    const headers = {};
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${BASE_URL}/courses/${courseId}/grade-exam-ad-hoc`, {
      method: "POST",
      headers,
      body: backendFormData,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Ad-hoc exam grading error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
