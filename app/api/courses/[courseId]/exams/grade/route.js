import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// Supported image MIME types for conversion
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

// POST /api/courses/:courseId/exams/grade - Grade a practice exam
export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const formData = await request.formData();
    
    const userId = formData.get("userId");
    const examType = formData.get("exam_type"); // midterm or final
    const examNumber = formData.get("exam_number"); // exam number (1, 2, etc.)
    const file = formData.get("input_pdf");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!examType || !["midterm", "final"].includes(examType)) {
      return NextResponse.json({ error: "exam_type must be 'midterm' or 'final'" }, { status: 400 });
    }
    if (!examNumber) {
      return NextResponse.json({ error: "exam_number is required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "input_pdf file is required" }, { status: 400 });
    }

    // Get file details
    const fileName = file.name || "exam";
    const mimeType = file.type || "application/octet-stream";
    let fileBuffer = Buffer.from(await file.arrayBuffer());
    let finalMimeType = mimeType;
    let finalFileName = fileName;

    // Convert images to PDF if needed
    if (IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
      try {
        // Dynamic import for PDF creation from images
        const { PDFDocument } = await import("pdf-lib");
        
        const pdfDoc = await PDFDocument.create();
        
        let image;
        if (mimeType.includes("png")) {
          image = await pdfDoc.embedPng(fileBuffer);
        } else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
          image = await pdfDoc.embedJpg(fileBuffer);
        } else {
          // For other formats (webp, heic), we need to convert them first
          // For now, return an error suggesting supported formats
          return NextResponse.json(
            { error: "Unsupported image format. Please upload JPEG, PNG, or PDF files." },
            { status: 400 }
          );
        }

        // Create a page with the image dimensions (or A4 if image is too large)
        const { width: imgWidth, height: imgHeight } = image.scale(1);
        const maxWidth = 595; // A4 width in points
        const maxHeight = 842; // A4 height in points
        
        let pageWidth = imgWidth;
        let pageHeight = imgHeight;
        let scale = 1;
        
        // Scale down if image is too large
        if (imgWidth > maxWidth || imgHeight > maxHeight) {
          const widthScale = maxWidth / imgWidth;
          const heightScale = maxHeight / imgHeight;
          scale = Math.min(widthScale, heightScale);
          pageWidth = imgWidth * scale;
          pageHeight = imgHeight * scale;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });

        fileBuffer = Buffer.from(await pdfDoc.save());
        finalMimeType = "application/pdf";
        finalFileName = fileName.replace(/\.[^.]+$/, ".pdf");
      } catch (convErr) {
        console.error("PDF conversion error:", convErr);
        return NextResponse.json(
          { error: "Failed to convert image to PDF", details: String(convErr) },
          { status: 500 }
        );
      }
    }

    // Verify it's now a PDF
    if (finalMimeType !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF or image (JPEG/PNG)" },
        { status: 400 }
      );
    }

    // Create form data for backend
    const backendFormData = new FormData();
    backendFormData.append("userId", userId);
    backendFormData.append("exam_type", examType);
    backendFormData.append("exam_number", examNumber);
    backendFormData.append("input_pdf", new Blob([fileBuffer], { type: finalMimeType }), finalFileName);

    const url = new URL(`/courses/${courseId}/grade-exam`, BASE_URL);

    // Long timeout for grading (can take a while with AI processing)
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
    
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        body: backendFormData,
        signal: controller.signal,
      });

      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        data = { error: "Invalid JSON from backend", raw: bodyText };
      }
      
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    console.error("Grade exam error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
