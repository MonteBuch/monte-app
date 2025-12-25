// src/components/admin/AdminSystemTools.jsx
import React, { useState, useRef, useCallback } from "react";
import {
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  Mail,
  Users,
  Upload,
  Image,
  X,
  Type,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  Copy,
  Calendar,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { useToast } from "../ui/Toast";
import { useFacility, DEFAULT_FACILITY_NAME, DEFAULT_DISPLAY_NAME } from "../../context/FacilityContext";

export default function AdminSystemTools() {
  const { showSuccess, showError, showWarning } = useToast();
  const { facility, refreshFacility } = useFacility();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const calendarFileInputRef = useRef(null);

  // Calendar import/export states
  const [calendarExporting, setCalendarExporting] = useState(false);
  const [calendarImporting, setCalendarImporting] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Reset states
  const [resetStep, setResetStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(null);

  // Export states
  const [exporting, setExporting] = useState(false);

  // App Name states
  const [appName, setAppName] = useState(facility.display_name || "");
  const [savingName, setSavingName] = useState(false);

  // Logo states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cropSettings, setCropSettings] = useState({ scale: 1, x: 0, y: 0 });

  // Update appName when facility changes
  React.useEffect(() => {
    setAppName(facility.display_name || "");
  }, [facility.display_name]);

  /* =============================================================
     APP NAME (Display Name)
     ============================================================= */
  const handleSaveAppName = async () => {
    if (!appName.trim()) {
      showWarning("Bitte gib einen Namen ein");
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from("facilities")
        .update({ display_name: appName.trim() })
        .eq("id", FACILITY_ID);

      if (error) throw error;

      refreshFacility();
      showSuccess("App-Name gespeichert");
    } catch (err) {
      console.error("App-Name speichern fehlgeschlagen:", err);
      showError("Speichern fehlgeschlagen: " + err.message);
    } finally {
      setSavingName(false);
    }
  };

  /* =============================================================
     DATA EXPORT
     ============================================================= */
  const exportUsers = async () => {
    setExporting(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, primary_group, created_at")
        .eq("facility_id", FACILITY_ID)
        .order("full_name");

      if (usersError) throw usersError;

      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("facility_id", FACILITY_ID);

      if (groupsError) throw groupsError;

      const groupMap = {};
      groups.forEach((g) => { groupMap[g.id] = g.name; });

      const { data: children, error: childrenError } = await supabase
        .from("children")
        .select("user_id, group_id")
        .eq("facility_id", FACILITY_ID);

      if (childrenError) throw childrenError;

      const parentGroupsMap = {};
      children.forEach((child) => {
        if (!parentGroupsMap[child.user_id]) {
          parentGroupsMap[child.user_id] = new Set();
        }
        if (child.group_id && groupMap[child.group_id]) {
          parentGroupsMap[child.user_id].add(groupMap[child.group_id]);
        }
      });

      const headers = ["Name", "Email", "Rolle", "Stammgruppe", "Kindergruppen", "Erstellt am"];
      const rows = users.map((u) => {
        let childrenGroups = "-";
        if (u.role === "parent" && parentGroupsMap[u.id]) {
          childrenGroups = Array.from(parentGroupsMap[u.id]).join(", ") || "-";
        }
        return [
          u.full_name || "",
          u.email || "",
          u.role === "admin" ? "Admin" : u.role === "team" ? "Team" : "Eltern",
          groupMap[u.primary_group] || "-",
          childrenGroups,
          u.created_at ? new Date(u.created_at).toLocaleDateString("de-DE") : "",
        ];
      });

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      downloadCSV(csvContent, `benutzer_export_${formatDate()}.csv`);
      showSuccess(`${users.length} Benutzer exportiert`);
    } catch (err) {
      console.error("Export fehlgeschlagen:", err);
      showError("Export fehlgeschlagen: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportEmails = async () => {
    setExporting(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("facility_id", FACILITY_ID)
        .not("email", "is", null)
        .order("full_name");

      if (profilesError) throw profilesError;

      const emailSet = new Map();
      profiles.forEach((p) => {
        if (p.email) {
          emailSet.set(p.email.toLowerCase(), {
            name: p.full_name,
            email: p.email,
            role: p.role,
          });
        }
      });

      const emails = Array.from(emailSet.values());
      const headers = ["Name", "Email", "Rolle"];
      const rows = emails.map((e) => [
        e.name || "",
        e.email,
        e.role === "admin" ? "Admin" : e.role === "team" ? "Team" : "Eltern",
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      downloadCSV(csvContent, `email_liste_${formatDate()}.csv`);
      showSuccess(`${emails.length} Email-Adressen exportiert`);
    } catch (err) {
      console.error("Email-Export fehlgeschlagen:", err);
      showError("Export fehlgeschlagen: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (content, filename) => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* =============================================================
     CALENDAR EXPORT/IMPORT
     ============================================================= */
  const exportCalendarEvents = async () => {
    setCalendarExporting(true);
    try {
      // Exportiere nur Termine des ausgewählten Jahres (basierend auf Startdatum)
      const { data: events, error } = await supabase
        .from("facility_events")
        .select("title, date_start, date_end, time_info, category, notes")
        .eq("facility_id", FACILITY_ID)
        .gte("date_start", `${calendarYear}-01-01`)
        .lte("date_start", `${calendarYear}-12-31`)
        .order("date_start", { ascending: true });

      if (error) throw error;

      if (!events || events.length === 0) {
        showWarning(`Keine Termine für ${calendarYear} vorhanden`);
        return;
      }

      const headers = ["Titel", "Startdatum", "Enddatum", "Uhrzeit", "Kategorie", "Notizen"];
      const rows = events.map((e) => [
        e.title || "",
        e.date_start || "",
        e.date_end || "",
        e.time_info || "",
        e.category || "other",
        e.notes || "",
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

      downloadCSV(csvContent, `termine_${calendarYear}_export_${formatDate()}.csv`);
      showSuccess(`${events.length} Termine für ${calendarYear} exportiert`);
    } catch (err) {
      console.error("Termin-Export fehlgeschlagen:", err);
      showError("Export fehlgeschlagen: " + err.message);
    } finally {
      setCalendarExporting(false);
    }
  };

  const handleCalendarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCalendarImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        showError("CSV-Datei enthält keine Daten");
        return;
      }

      // Skip header
      const dataLines = lines.slice(1);
      const events = [];
      let skipped = 0;

      for (const line of dataLines) {
        // Parse CSV with semicolon delimiter
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ";" && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const [title, date_start, date_end, time_info, category, notes] = values;

        if (!title || !date_start) {
          skipped++;
          continue;
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date_start)) {
          skipped++;
          continue;
        }

        events.push({
          facility_id: FACILITY_ID,
          title: title,
          date_start: date_start,
          date_end: date_end && /^\d{4}-\d{2}-\d{2}$/.test(date_end) ? date_end : null,
          time_info: time_info || null,
          category: ["closed", "parent_event", "celebration", "other"].includes(category) ? category : "other",
          notes: notes || null,
        });
      }

      if (events.length === 0) {
        showError("Keine gültigen Termine gefunden");
        return;
      }

      const { error } = await supabase.from("facility_events").insert(events);
      if (error) throw error;

      showSuccess(`${events.length} Termine importiert${skipped > 0 ? ` (${skipped} übersprungen)` : ""}`);
    } catch (err) {
      console.error("Termin-Import fehlgeschlagen:", err);
      showError("Import fehlgeschlagen: " + err.message);
    } finally {
      setCalendarImporting(false);
      if (calendarFileInputRef.current) {
        calendarFileInputRef.current.value = "";
      }
    }
  };

  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  /* =============================================================
     LOGO UPLOAD WITH CROPPER
     ============================================================= */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Bitte wähle eine Bilddatei aus");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Das Bild darf maximal 5MB groß sein");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setOriginalImage(img);
        setCropSettings({ scale: 1, x: 0, y: 0 });
        setCropperOpen(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const drawCroppedImage = useCallback(() => {
    if (!canvasRef.current || !originalImage) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = 200; // Output size
    canvas.width = size;
    canvas.height = size;

    // Clear with white background (removes transparency)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Calculate dimensions
    const { scale, x, y } = cropSettings;
    const imgSize = Math.min(originalImage.width, originalImage.height);
    const scaledSize = imgSize / scale;

    // Center offset
    const sourceX = (originalImage.width - scaledSize) / 2 - (x * scaledSize / size);
    const sourceY = (originalImage.height - scaledSize) / 2 - (y * scaledSize / size);

    // Draw the image
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      originalImage,
      sourceX, sourceY, scaledSize, scaledSize,
      0, 0, size, size
    );
    ctx.restore();

    return canvas;
  }, [originalImage, cropSettings]);

  // Draw preview when crop settings change
  React.useEffect(() => {
    if (cropperOpen && originalImage) {
      drawCroppedImage();
    }
  }, [cropperOpen, originalImage, cropSettings, drawCroppedImage]);

  const handleCropConfirm = async () => {
    const canvas = drawCroppedImage();
    if (!canvas) return;

    setUploadingLogo(true);
    setCropperOpen(false);

    try {
      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png", 1.0);
      });

      const fileName = `logo_${FACILITY_ID}_${Date.now()}.png`;

      // Delete old logo if exists
      if (facility.logo_url) {
        const oldPath = facility.logo_url.split("/").pop();
        await supabase.storage.from("facility-logos").remove([oldPath]);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("facility-logos")
        .upload(fileName, blob, { upsert: true, contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("facility-logos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("facilities")
        .update({ logo_url: publicUrl })
        .eq("id", FACILITY_ID);

      if (updateError) throw updateError;

      refreshFacility();
      showSuccess("Logo erfolgreich gespeichert");
    } catch (err) {
      console.error("Logo-Upload fehlgeschlagen:", err);
      showError("Logo-Upload fehlgeschlagen: " + err.message);
    } finally {
      setUploadingLogo(false);
      setOriginalImage(null);
    }
  };

  const handleLogoRemove = async () => {
    if (!facility.logo_url) return;

    setUploadingLogo(true);
    try {
      const fileName = facility.logo_url.split("/").pop();
      await supabase.storage.from("facility-logos").remove([fileName]);

      const { error: updateError } = await supabase
        .from("facilities")
        .update({ logo_url: null })
        .eq("id", FACILITY_ID);

      if (updateError) throw updateError;

      refreshFacility();
      showSuccess("Logo entfernt");
    } catch (err) {
      console.error("Logo entfernen fehlgeschlagen:", err);
      showError("Logo entfernen fehlgeschlagen: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  /* =============================================================
     SYSTEM RESET
     ============================================================= */
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    // Ensure at least one of each required type
    password += "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
    password += "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)];
    password += "23456789"[Math.floor(Math.random() * 8)];
    password += "!@#$%"[Math.floor(Math.random() * 5)];
    // Fill rest randomly
    for (let i = 0; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    return password.split("").sort(() => Math.random() - 0.5).join("");
  };

  const handleResetConfirm = async () => {
    if (confirmText !== "Bestätigung") {
      showWarning('Bitte gib exakt "Bestätigung" ein');
      return;
    }

    setResetting(true);
    try {
      // Generate credentials for new admin
      const adminEmail = `admin@${FACILITY_ID.substring(0, 8)}.local`;
      const adminPassword = generatePassword();

      // KOMPLETTER RESET
      await supabase.from("news").delete().eq("facility_id", FACILITY_ID);
      await supabase.from("absences").delete().eq("facility_id", FACILITY_ID);

      const { data: groupIds } = await supabase
        .from("groups")
        .select("id")
        .eq("facility_id", FACILITY_ID);

      if (groupIds?.length > 0) {
        await supabase.from("group_lists").delete().in("group_id", groupIds.map(g => g.id));
      }

      await supabase.from("children").delete().eq("facility_id", FACILITY_ID);
      await supabase.from("meal_plans").delete().eq("facility_id", FACILITY_ID);
      await supabase.from("meal_options").delete().eq("facility_id", FACILITY_ID);
      await supabase.from("invite_links").delete().eq("facility_id", FACILITY_ID);

      const { data: profileIds } = await supabase
        .from("profiles")
        .select("id")
        .eq("facility_id", FACILITY_ID);

      if (profileIds?.length > 0) {
        await supabase.from("notification_preferences").delete().in("user_id", profileIds.map(p => p.id));
      }

      await supabase.from("profiles").delete().eq("facility_id", FACILITY_ID);
      await supabase.from("groups").delete().eq("facility_id", FACILITY_ID);

      // Delete logo
      if (facility.logo_url) {
        const fileName = facility.logo_url.split("/").pop();
        await supabase.storage.from("facility-logos").remove([fileName]);
      }

      // Reset facility
      await supabase
        .from("facilities")
        .update({
          name: DEFAULT_FACILITY_NAME,
          display_name: DEFAULT_DISPLAY_NAME,
          logo_url: null,
          address: null,
          phone: null,
          email: null,
          opening_hours: null,
          info_text: null,
        })
        .eq("id", FACILITY_ID);

      // Create new admin user via Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: "Administrator",
          },
        },
      });

      if (signUpError) {
        console.error("Admin-User erstellen fehlgeschlagen:", signUpError);
        // Still show success but warn about admin creation
        setResetCredentials({
          email: "Fehler beim Erstellen",
          password: "Bitte manuell erstellen",
          error: true,
        });
      } else if (authData.user) {
        // Create profile for new admin
        await supabase.from("profiles").insert({
          id: authData.user.id,
          facility_id: FACILITY_ID,
          full_name: "Administrator",
          email: adminEmail,
          role: "admin",
          must_reset_password: true,
        });

        setResetCredentials({
          email: adminEmail,
          password: adminPassword,
          error: false,
        });
      }

      showSuccess("System-Reset abgeschlossen!");
      setResetStep(3); // Show credentials step
      setConfirmText("");
    } catch (err) {
      console.error("System-Reset fehlgeschlagen:", err);
      showError("System-Reset fehlgeschlagen: " + err.message);
      setResetting(false);
    }
  };

  const handleLogoutAfterReset = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Kopiert!");
    } catch (err) {
      showError("Kopieren fehlgeschlagen");
    }
  };

  /* =============================================================
     UI
     ============================================================= */
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800">System-Tools</h2>

      {/* DATENEXPORT */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-700 flex items-center gap-2">
          <Download size={18} />
          Datenexport
        </h3>
        <p className="text-sm text-stone-500">
          Exportiere Benutzer- und Email-Listen als CSV-Datei.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportUsers}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <><Users size={18} /> Benutzer</>}
          </button>
          <button
            onClick={exportEmails}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <><Mail size={18} /> Emails</>}
          </button>
        </div>
      </div>

      {/* TERMIN EXPORT/IMPORT */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-700 flex items-center gap-2">
          <Calendar size={18} />
          Termine Export / Import
        </h3>
        <p className="text-sm text-stone-500">
          Exportiere Termine als CSV oder importiere aus einer CSV-Datei. Das Startdatum bestimmt die Jahreszuordnung.
        </p>

        {/* Jahresauswahl */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">Jahr:</span>
          <select
            value={calendarYear}
            onChange={(e) => setCalendarYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportCalendarEvents}
            disabled={calendarExporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {calendarExporting ? <Loader2 className="animate-spin" size={18} /> : <><Download size={18} /> Export {calendarYear}</>}
          </button>
          <input
            type="file"
            ref={calendarFileInputRef}
            accept=".csv"
            onChange={handleCalendarFileSelect}
            className="hidden"
          />
          <button
            onClick={() => calendarFileInputRef.current?.click()}
            disabled={calendarImporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {calendarImporting ? <Loader2 className="animate-spin" size={18} /> : <><Upload size={18} /> Import</>}
          </button>
        </div>
        <p className="text-xs text-stone-400">
          CSV-Format: Titel; Startdatum (YYYY-MM-DD); Enddatum; Uhrzeit; Kategorie (closed/parent_event/celebration/other); Notizen
        </p>
      </div>

      {/* APP NAME */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-700 flex items-center gap-2">
          <Type size={18} />
          App-Name
        </h3>
        <p className="text-sm text-stone-500">
          Dieser Name erscheint im Header, Login und in Emails.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="z. B. Montessori Kinderhaus"
            className="flex-1 p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSaveAppName}
            disabled={savingName || appName === facility.display_name}
            className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {savingName ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Speichern
          </button>
        </div>
      </div>

      {/* LOGO UPLOAD */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-700 flex items-center gap-2">
          <Image size={18} />
          Logo
        </h3>
        <p className="text-sm text-stone-500">
          Das Logo erscheint im Header und Login. Du kannst den Bildausschnitt anpassen.
        </p>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-stone-200">
            {facility.logo_url ? (
              <img src={facility.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Image size={24} className="text-stone-400" />
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="animate-spin" size={16} /> : <><Upload size={16} /> Bild auswählen</>}
            </button>
            {facility.logo_url && (
              <button
                onClick={handleLogoRemove}
                disabled={uploadingLogo}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-300 transition-colors disabled:opacity-50"
              >
                <X size={16} /> Entfernen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CROPPER MODAL */}
      {cropperOpen && originalImage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Move size={18} />
              Bildausschnitt anpassen
            </h3>

            {/* Preview */}
            <div className="flex justify-center">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="rounded-full border-4 border-amber-500"
                  style={{ width: 150, height: 150 }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ZoomOut size={16} className="text-stone-500" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={cropSettings.scale}
                  onChange={(e) => setCropSettings(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <ZoomIn size={16} className="text-stone-500" />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-20">Horizontal</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cropSettings.x}
                  onChange={(e) => setCropSettings(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-20">Vertikal</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cropSettings.y}
                  onChange={(e) => setCropSettings(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                  className="flex-1"
                />
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Transparente Bereiche werden weiß gefüllt.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => { setCropperOpen(false); setOriginalImage(null); }}
                className="flex-1 py-2 bg-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-300"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 py-2 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM RESET */}
      <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle size={18} />
          Kompletter System-Reset
        </h3>
        <p className="text-sm text-stone-600">
          <strong className="text-red-600">ACHTUNG:</strong> Löscht ALLE Daten unwiderruflich.
        </p>
        <ul className="text-sm text-stone-600 list-disc list-inside ml-2 space-y-1">
          <li>Alle Benutzerkonten (inkl. deines eigenen!)</li>
          <li>Alle Gruppen, News, Kinder, Speisepläne</li>
          <li>Einrichtungsdaten werden zurückgesetzt</li>
        </ul>
        <p className="text-sm text-green-700 font-medium">
          ✓ Ein neuer Admin-Account wird erstellt und dir angezeigt.
        </p>

        {resetStep === 0 && (
          <button
            onClick={() => setResetStep(1)}
            className="w-full py-3 bg-red-100 text-red-700 font-semibold rounded-xl hover:bg-red-200 flex items-center justify-center gap-2"
          >
            <Trash2 size={18} /> System zurücksetzen...
          </button>
        )}

        {resetStep === 1 && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm font-semibold text-red-800">
              ⚠️ Bist du ABSOLUT sicher?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetStep(0)} className="flex-1 py-2 bg-stone-200 text-stone-700 font-semibold rounded-lg">
                Abbrechen
              </button>
              <button onClick={() => { setResetStep(2); setConfirmText(""); }} className="flex-1 py-2 bg-red-500 text-white font-semibold rounded-lg">
                Ja, fortfahren
              </button>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm font-semibold text-red-800">
              🔒 Gib <code className="bg-red-100 px-1 rounded">Bestätigung</code> ein:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Tippe "Bestätigung"'
              className="w-full p-3 border border-red-300 rounded-xl text-sm"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setResetStep(0)} className="flex-1 py-2 bg-stone-200 text-stone-700 font-semibold rounded-lg">
                Abbrechen
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting || confirmText !== "Bestätigung"}
                className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {resetting ? "Lösche..." : "ALLES löschen"}
              </button>
            </div>
          </div>
        )}

        {resetStep === 3 && resetCredentials && (
          <div className="space-y-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-sm font-semibold text-green-800">
              ✓ Reset abgeschlossen! Neuer Admin-Account:
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                <span className="text-xs text-stone-500 w-16">Email:</span>
                <code className="flex-1 text-sm font-mono">{resetCredentials.email}</code>
                <button onClick={() => copyToClipboard(resetCredentials.email)} className="p-1 hover:bg-stone-100 rounded">
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                <span className="text-xs text-stone-500 w-16">Passwort:</span>
                <code className="flex-1 text-sm font-mono">{resetCredentials.password}</code>
                <button onClick={() => copyToClipboard(resetCredentials.password)} className="p-1 hover:bg-stone-100 rounded">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              ⚠️ Diese Zugangsdaten jetzt notieren! Nach dem Abmelden sind sie nicht mehr sichtbar.
              {resetCredentials.error && " (Admin konnte nicht automatisch erstellt werden - bitte manuell anlegen)"}
            </p>

            <button
              onClick={handleLogoutAfterReset}
              className="w-full py-3 bg-stone-800 text-white font-semibold rounded-xl hover:bg-stone-900"
            >
              Verstanden, jetzt abmelden
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
