import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAlreadyRegisteredError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already") ||
    message.includes("duplicate")
  );
}

async function sendOtpEmail({ apiKey, from, to, otp }) {
  const subject = "Your Kogno verification code";
  const html = `
<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;font-family:'Nunito','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <body style="margin:0;padding:0;background-color:#f7f5f1;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f7f5f1;padding:48px 16px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" role="presentation" style="max-width:460px;width:100%;">
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <span style="font-size:26px;font-weight:700;color:#5a8a59;letter-spacing:-0.5px;">Kogno</span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:20px;border:1px solid #c5bfb4;padding:44px 36px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center" style="padding-bottom:28px;">
                      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg, rgba(90,138,89,0.15) 0%, rgba(123,163,122,0.1) 100%);line-height:64px;text-align:center;">
                        <span style="font-size:28px;">🎓</span>
                      </div>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center" style="padding-bottom:12px;">
                      <h1 style="margin:0;font-size:26px;font-weight:700;color:#1f2b1c;line-height:1.3;letter-spacing:-0.3px;">
                        Verify Your Student Status
                      </h1>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center" style="padding-bottom:28px;">
                      <p style="margin:0;font-size:15px;line-height:1.7;color:#566550;">
                        Confirm your .edu email to create your Kogno account and get grade improvements like you've NEVER seen before!
                      </p>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <div style="display:inline-block;padding:14px 24px;border-radius:14px;background:#f7f5f1;border:1px solid #ebe8e2;font-size:28px;font-weight:700;letter-spacing:8px;color:#1f2b1c;">
                        ${otp}
                      </div>
                      <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.4px;color:#566550;text-transform:uppercase;">
                        Verification code
                      </p>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding-bottom:24px;">
                      <div style="height:1px;background-color:#ebe8e2;"></div>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="background-color:#f7f5f1;border-radius:14px;padding:18px 20px;border:1px solid #ebe8e2;">
                      <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#1f2b1c;">
                        Didn't request this?
                      </p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#566550;">
                        You can safely ignore this email. The verification code expires soon.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px;">
                <p style="margin:0;font-size:12px;color:#566550;">
                  https://kognolearn.com&nbsp;&nbsp;Learn Smarter, Not Harder
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
  const text = `Your Kogno verification code is ${otp}. If you didn't request this, you can ignore this email.`;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Resend error: ${response.status} ${errorText}`);
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { email, password, fullName, mode } = body ?? {};

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
  }
  if (!resendFrom) {
    return NextResponse.json({ error: "RESEND_FROM_EMAIL is not configured." }, { status: 500 });
  }

  const supabase = getServiceSupabaseClient();

  let verificationType = "signup";
  let linkResult;

  if (mode === "resend") {
    verificationType = "magiclink";
    linkResult = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });
  } else {
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    linkResult = await supabase.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });

    if (linkResult?.error && isAlreadyRegisteredError(linkResult.error)) {
      verificationType = "magiclink";
      linkResult = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });
    }
  }

  if (linkResult?.error) {
    return NextResponse.json(
      { error: linkResult.error.message || "Unable to generate verification code." },
      { status: 400 }
    );
  }

  const otp = linkResult?.data?.properties?.email_otp;
  if (!otp) {
    return NextResponse.json({ error: "Unable to generate verification code." }, { status: 500 });
  }

  try {
    await sendOtpEmail({
      apiKey: resendApiKey,
      from: resendFrom,
      to: normalizedEmail,
      otp,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return NextResponse.json(
      { error: "Unable to send verification email." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    email: normalizedEmail,
    verificationType,
  });
}
