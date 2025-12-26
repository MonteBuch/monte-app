// send-news-email Edge Function
// Sendet News-Benachrichtigungen per Email via Resend
// WICHTIG: Alle Empfänger werden als BCC gesendet (Datenschutz)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Monte App <noreply@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string[];
  subject: string;
  news_title: string;
  news_content: string;
  group_name?: string;
  author_name?: string;
  app_url: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body: EmailRequest = await req.json();
    const { to, subject, news_title, news_content, group_name, author_name, app_url } = body;

    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipients provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HTML Email Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${news_title || "Neue Mitteilung"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${group_name ? `${group_name}` : "Neue Mitteilung"}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              ${news_title ? `<h2 style="margin: 0 0 16px 0; color: #1c1917; font-size: 20px; font-weight: bold;">${news_title}</h2>` : ""}

              <div style="color: #44403c; font-size: 16px; line-height: 1.6;">
                ${news_content}
              </div>

              ${author_name ? `
              <p style="margin-top: 24px; color: #78716c; font-size: 14px;">
                Gesendet von: ${author_name}
              </p>
              ` : ""}
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding: 0 24px 24px 24px; text-align: center;">
              <a href="${app_url}" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                In der App öffnen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafaf9; padding: 16px 24px; text-align: center; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0; color: #a8a29e; font-size: 12px;">
                Diese Nachricht wurde automatisch gesendet.
                <br>
                Sie erhalten diese Email, weil Sie Benachrichtigungen aktiviert haben.
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

    // Plain text version
    const textContent = `
${group_name ? `${group_name}: ` : ""}${news_title || "Neue Mitteilung"}

${news_content.replace(/<[^>]*>/g, "")}

${author_name ? `Gesendet von: ${author_name}` : ""}

In der App öffnen: ${app_url}
    `.trim();

    // WICHTIG: Alle Empfänger als BCC senden (Datenschutz!)
    // "to" enthält eine neutrale Adresse, alle echten Empfänger sind in "bcc"
    const emailPayload = {
      from: FROM_EMAIL,
      to: FROM_EMAIL, // Sende an sich selbst (oder eine no-reply Adresse)
      bcc: to, // Alle Empfänger als BCC
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    console.log(`Sending email to ${to.length} recipients via BCC`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: to.length,
        messageId: result.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
