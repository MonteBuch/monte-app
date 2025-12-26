import { useState, useEffect } from "react";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

// Außerhalb der Komponente definiert, um Neuerstellung bei jedem Render zu vermeiden
function ReasonButton({ value, label, reason, setReason }) {
  const active = reason === value;

  return (
    <button
      type="button"
      onClick={() => setReason(value)}
      className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold border transition ${
        active
          ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600"
          : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function AbsenceEditor({
  mode = "create",
  initialData,
  child,
  groups = [],
  onSave,
  onCancel,
}) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState("single"); // single | range
  const [dateFrom, setDateFrom] = useState(todayIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [reason, setReason] = useState("urlaub");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (!initialData) return;

    setType(initialData.type || "single");
    setDateFrom(initialData.dateFrom || todayIso);
    setDateTo(initialData.dateTo || initialData.dateFrom || todayIso);
    setReason(initialData.reason || "urlaub");
    setOtherText(initialData.otherText || "");
  }, [initialData, todayIso]);

  // Zeitraum → Default Urlaub, aber nicht sperren
  useEffect(() => {
    if (type === "range") {
      setReason("urlaub");
    }
  }, [type]);

  // VALIDIERUNG
  const validate = () => {
    if (!dateFrom) return false;

    // Einzeltag → darf nicht vor heute liegen
    if (type === "single" && dateFrom < todayIso) {
      alert("Datum darf nicht in der Vergangenheit liegen.");
      return false;
    }

    // Zeitraum → 'Bis' nicht in Vergangenheit
    if (type === "range" && dateTo < todayIso) {
      alert("Das Enddatum darf nicht in der Vergangenheit liegen.");
      return false;
    }

    // Zeitraum → 'Bis' muss >= 'Von'
    if (type === "range" && dateTo < dateFrom) {
      alert("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      id: initialData?.id || crypto.randomUUID(),
      childId: child.id,
      childName: child.name,
      groupId: child.group,
      type,
      dateFrom,
      dateTo: type === "range" ? dateTo : null,
      reason,
      otherText: otherText.trim() || "",
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: initialData?.status || "new",
    };

    onSave(payload);
  };

  if (!child) return null;

  // Gruppe dynamisch aus groups + groupUtils
  const groupRaw = getGroupById(groups, child.group);
  const group = getGroupStyles(groupRaw);

  // Mindestdatum für das Enddatum: nicht vor heute und nicht vor dem Startdatum
  const minDateTo = dateFrom && dateFrom > todayIso ? dateFrom : todayIso;

  return (
    <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 space-y-5">
      {/* Kopf */}
      <div className="flex items-center gap-3">
        <div
          className={`${
            group.chipClass || "bg-stone-400 text-white"
          } p-3 rounded-2xl text-white flex items-center justify-center`}
        >
          <group.Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{child.name}</p>
          {group && (
            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              {group.name}
            </p>
          )}
        </div>
      </div>

      {/* Einzeltag / Zeitraum */}
      <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => setType("single")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
            type === "single"
              ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600"
              : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-transparent hover:bg-stone-100 dark:hover:bg-stone-700"
          }`}
        >
          Einzeltag
        </button>

        <button
          type="button"
          onClick={() => setType("range")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
            type === "range"
              ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600"
              : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-transparent hover:bg-stone-100 dark:hover:bg-stone-700"
          }`}
        >
          Zeitraum
        </button>
      </div>

      {/* Datum */}
      <div className="space-y-3">
        {type === "single" ? (
          <div className="flex flex-col">
            <label className="text-xs text-stone-600 dark:text-stone-300 mb-1">Datum</label>
            <input
              type="date"
              value={dateFrom}
              min={todayIso}
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm text-stone-900 dark:text-stone-100"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-stone-600 dark:text-stone-300 mb-1">Von</label>
              <input
                type="date"
                value={dateFrom}
                min={todayIso}
                onChange={(e) => setDateFrom(e.target.value)}
                className="p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm text-stone-900 dark:text-stone-100"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-stone-600 dark:text-stone-300 mb-1">Bis</label>
              <input
                type="date"
                value={dateTo}
                min={minDateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grund */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 uppercase tracking-wide">
          Grund
        </p>

        <div className="grid grid-cols-2 gap-2">
          <ReasonButton value="krankheit" label="Krank" reason={reason} setReason={setReason} />
          <ReasonButton value="urlaub" label="Urlaub" reason={reason} setReason={setReason} />
          <ReasonButton value="termin" label="Termin" reason={reason} setReason={setReason} />
          <ReasonButton value="sonstiges" label="Sonstiges" reason={reason} setReason={setReason} />
        </div>

        {/* Hinweis-Feld - immer sichtbar */}
        <div className="mt-2">
          <label className="text-xs text-stone-600 dark:text-stone-300 mb-1 block">
            Hinweis (optional)
          </label>
          <textarea
            rows={2}
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-sm text-stone-900 dark:text-stone-100 resize-none"
            placeholder="Zusätzliche Informationen für das Team …"
          />
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-amber-500 text-white py-2 rounded-xl font-bold text-sm hover:bg-amber-600 active:scale-[0.99] transition-transform"
        >
          {mode === "edit" ? "Meldung speichern" : "Meldung absenden"}
        </button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-sm hover:bg-stone-300 dark:hover:bg-stone-600"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}
