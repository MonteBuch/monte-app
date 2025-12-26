// src/api/emailApi.js
// API für Email-Versand via Edge Function

import { supabase } from "./supabaseClient";
import { FACILITY_ID } from "../lib/constants";

/**
 * Holt alle Email-Empfänger für eine News basierend auf Gruppen
 * @param {string[]|null} groupIds - Array von Gruppen-IDs oder null für "alle"
 * @returns {Promise<{registered: Array, external: Array}>}
 */
export async function getEmailRecipientsForNews(groupIds) {
  try {
    // Normalisieren: null/undefined → alle, einzelne ID → Array
    const targetGroupIds = !groupIds || groupIds.length === 0
      ? null // alle Gruppen
      : Array.isArray(groupIds) ? groupIds : [groupIds];

    // 1. Registrierte Eltern mit Email-Benachrichtigung
    let registeredQuery = supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        children (
          id,
          group_id
        ),
        notification_preferences (
          category,
          preference
        )
      `)
      .eq("facility_id", FACILITY_ID)
      .eq("role", "parent");

    const { data: profiles, error: profileError } = await registeredQuery;

    if (profileError) {
      console.error("Fehler beim Laden der Profile:", profileError);
      throw profileError;
    }

    // Filtern nach Gruppe und Email-Präferenz
    console.log("Alle geladenen Profile:", profiles?.length || 0);

    const registeredEmails = (profiles || [])
      .filter(p => {
        // Prüfen ob Email-Benachrichtigung für News aktiviert ist
        const newsPrefs = p.notification_preferences?.find(np => np.category === 'news');
        // WICHTIG: Standard ist jetzt 'both' (Email + App) statt nur 'app'
        // Nutzer können in Profil → Benachrichtigungen auf 'app' oder 'off' ändern
        const preference = newsPrefs?.preference || 'both';
        const emailEnabled = preference === 'email' || preference === 'both';

        console.log(`Profil ${p.full_name}: news preference = "${preference}" (explizit: ${!!newsPrefs}), emailEnabled = ${emailEnabled}`);

        if (!emailEnabled) return false;

        // Prüfen ob Kind in einer der Zielgruppen ist
        if (!targetGroupIds) return true; // "Alle" - alle Eltern
        const hasMatchingChild = p.children?.some(c => targetGroupIds.includes(c.group_id));
        console.log(`  → Kinder in Zielgruppen: ${hasMatchingChild}`);
        return hasMatchingChild;
      })
      .map(p => p.email)
      .filter(Boolean);

    console.log("Registrierte Emails gefunden:", registeredEmails);

    // 2. Externe Emails aus dem Verzeichnis
    console.log("Lade externe Emails, targetGroupIds:", targetGroupIds);
    let externalQuery = supabase
      .from("group_email_directory")
      .select("email, group_id")
      .eq("facility_id", FACILITY_ID);

    if (targetGroupIds) {
      externalQuery = externalQuery.in("group_id", targetGroupIds);
    }

    const { data: externalRows, error: externalError } = await externalQuery;
    console.log("Externe Emails Ergebnis:", { rows: externalRows, error: externalError });

    if (externalError) {
      console.error("Fehler beim Laden der externen Emails:", externalError);
      throw externalError;
    }

    const externalEmails = (externalRows || [])
      .map(r => r.email)
      .filter(Boolean)
      .filter(email => !registeredEmails.map(e => e.toLowerCase()).includes(email.toLowerCase()));

    return {
      registered: [...new Set(registeredEmails)],
      external: [...new Set(externalEmails)],
    };

  } catch (error) {
    console.error("Fehler beim Laden der Email-Empfänger:", error);
    return { registered: [], external: [] };
  }
}

/**
 * Extrahiert den Titel aus HTML-Content (erste Überschrift oder erste Zeile)
 */
function extractTitleFromHtml(html) {
  // Versuche H2 zu finden
  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  if (h2Match) {
    return h2Match[1].replace(/<[^>]*>/g, '').trim();
  }

  // Fallback: Ersten Paragraph
  const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (pMatch) {
    const text = pMatch[1].replace(/<[^>]*>/g, '').trim();
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  }

  // Letzter Fallback: Plain text
  const plainText = html.replace(/<[^>]*>/g, '').trim();
  return plainText.length > 60 ? plainText.substring(0, 60) + '...' : plainText;
}

/**
 * Konvertiert HTML für Email
 * Bilder werden beibehalten (komprimiert) oder bei zu großen Bildern ersetzt
 */
function htmlToEmailContent(html) {
  // Prüfe auf sehr große Base64-Bilder (> 500KB) und ersetze nur diese
  // Komprimierte Bilder sind typischerweise < 300KB
  const MAX_IMAGE_SIZE = 500 * 1024; // 500KB

  let content = html.replace(
    /<img([^>]*)src=["'](data:image\/[^"']+)["']([^>]*)>/gi,
    (match, before, dataUrl, after) => {
      // Base64-Größe schätzen (Base64 ist ~33% größer als binär)
      const estimatedSize = dataUrl.length * 0.75;
      if (estimatedSize > MAX_IMAGE_SIZE) {
        // Zu groß - Platzhalter zeigen
        return '<p style="color: #78716c; font-style: italic;">[Bild - in der App ansehen]</p>';
      }
      // Klein genug - behalten
      return match;
    }
  );

  // Ersetze <br> und <p> mit Zeilenumbrüchen (für Text-Version)
  // Aber behalte HTML für die Email
  content = content
    .replace(/<hr[^>]*>/gi, '<hr style="border: none; border-top: 1px solid #e7e5e4; margin: 16px 0;">')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '<h2 style="font-size: 18px; font-weight: bold; margin: 16px 0 8px 0;">$1</h2>')
    .replace(/<ul[^>]*>/gi, '<ul style="margin: 8px 0; padding-left: 20px;">')
    .replace(/<ol[^>]*>/gi, '<ol style="margin: 8px 0; padding-left: 20px;">')
    .replace(/<li[^>]*>/gi, '<li style="margin: 4px 0;">');

  // Entferne leere Paragraphen
  content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');

  return content.trim();
}

/**
 * Sendet News-Benachrichtigungen per Email
 * @param {Object} news - Die News-Daten (inkl. title)
 * @param {string[]|null} groupIds - Array von Gruppen-IDs oder null für alle
 * @param {string[]|null} groupNames - Array von Gruppennamen oder null
 * @param {string|null} authorName - Name des Autors
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
export async function sendNewsEmailNotifications(news, groupIds, groupNames, authorName) {
  try {
    console.log("=== EMAIL DEBUG START ===");
    console.log("News:", { id: news.id, title: news.title, groupIds });

    // Empfänger ermitteln (unterstützt jetzt Array von groupIds)
    const recipients = await getEmailRecipientsForNews(groupIds);
    console.log("Gefundene Empfänger:", {
      registered: recipients.registered,
      external: recipients.external,
    });

    const allEmails = [...recipients.registered, ...recipients.external];

    if (allEmails.length === 0) {
      console.log("Keine Email-Empfänger gefunden - prüfe notification_preferences!");
      console.log("=== EMAIL DEBUG END ===");
      return { success: true, sentCount: 0 };
    }

    // Titel: Explizit aus news.title oder aus HTML extrahieren
    const title = news.title || extractTitleFromHtml(news.text);
    let content = htmlToEmailContent(news.text);

    // Medien aus Attachments für Email aufbereiten
    console.log("News Attachments:", news.attachments);
    const imageAttachments = (news.attachments || []).filter(att =>
      att.type?.startsWith('image/') ||
      att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
      att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    const videoAttachments = (news.attachments || []).filter(att =>
      att.type?.startsWith('video/') ||
      att.name?.match(/\.(mp4|webm|mov|avi|mkv)$/i) ||
      att.url?.match(/\.(mp4|webm|mov|avi|mkv)$/i)
    );
    console.log("Image Attachments für Email:", imageAttachments.length);
    console.log("Video Attachments für Email:", videoAttachments.length);

    // Bilder als HTML für Email
    if (imageAttachments.length > 0) {
      const imagesHtml = imageAttachments.map(img => {
        return `<img src="${img.url}" alt="${img.name || 'Bild'}" style="display: block; max-width: 100%; width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;
      }).join('\n');

      content += `
        <div style="margin-top: 16px;">
          ${imagesHtml}
        </div>
      `;
    }

    // Videos als Platzhalter mit Hinweis (können nicht in Emails abgespielt werden)
    if (videoAttachments.length > 0) {
      const videosHtml = videoAttachments.map(() =>
        `<div style="background: linear-gradient(135deg, #1c1917 0%, #44403c 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 8px 0;">
          <div style="font-size: 48px; margin-bottom: 8px;">🎬</div>
          <p style="color: #fafaf9; font-weight: bold; margin: 0 0 4px 0;">Video verfügbar</p>
          <p style="color: #a8a29e; font-size: 14px; margin: 0;">In der App ansehen</p>
        </div>`
      ).join('\n');

      content += `
        <div style="margin-top: 16px;">
          ${videosHtml}
        </div>
      `;
    }

    // Gruppennamen für Betreff formatieren
    const groupLabel = groupNames && groupNames.length > 0
      ? groupNames.join(", ")
      : null;

    // Betreff: [Gruppen] Neue Mitteilung
    const subject = groupLabel
      ? `[${groupLabel}] Neue Mitteilung`
      : "Neue Mitteilung";

    // App-URL
    const appUrl = window.location.origin;

    console.log("Rufe Edge Function auf mit:", {
      to: allEmails,
      subject: subject,
      news_title: title,
      app_url: appUrl,
    });

    // Edge Function aufrufen
    const response = await supabase.functions.invoke('send-news-email', {
      body: {
        to: allEmails,
        subject: subject,
        news_title: title,
        news_content: content,
        group_name: groupLabel || null,
        author_name: authorName || null,
        app_url: appUrl,
      },
    });

    // Detailliertes Logging
    console.log("Edge Function Response:", response);
    console.log("=== EMAIL DEBUG END ===");

    if (response.error) {
      // Versuche den Fehler-Body zu lesen
      const errorData = response.data;
      console.error("Edge Function Fehler:", response.error);
      console.error("Edge Function Error Data:", errorData);
      throw new Error(errorData?.error || response.error.message || "Edge Function Fehler");
    }

    const data = response.data;
    if (data && !data.success) {
      console.error("Email-Versand fehlgeschlagen:", data);
      throw new Error(data.error || "Email-Versand fehlgeschlagen");
    }

    console.log(`Emails gesendet an ${allEmails.length} Empfänger`);
    return {
      success: true,
      sentCount: allEmails.length,
    };

  } catch (error) {
    console.error("Fehler beim Email-Versand:", error);
    return {
      success: false,
      sentCount: 0,
      error: error.message,
    };
  }
}
