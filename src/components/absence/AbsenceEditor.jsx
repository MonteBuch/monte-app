// src/components/absence/AbsenceEditor.jsx
import React, { useState, useEffect } from "react";
import { GROUPS } from "../../lib/constants";

export default function AbsenceEditor({
  mode = "create",
  initialData,
  child,
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
      otherText: reason === "sonstiges" ? otherText.trim() : "",
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: initialData?.status || "new",
    };

    onSave(payload);
  };

  const ReasonButton = ({ value, label }) => {
    const active = reason === value;

    return (
      <button
        type="button"
        onClick={() => setReason(value)}
        className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold border transition ${
          active
            ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm"
            : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100"
        }`}
      >
        {label}
      </button>
    );
  };

  if (!child) return null;

  const group = GROUPS.find((g) => g.id === child.group);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 space-y-5">
      {/* Kopf */}
      <div className="flex items-center gap-3">
        <div
          className={`${
            group?.color || "bg-stone-400"
          } p-3 rounded-2xl text-white flex items-center justify-center`}
        >
          {group?.icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">{child.name}</p>
          {group && (
            <p className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              {group.name}
            </p>
          )}
        </div>
      </div>

      {/* Einzeltag / Zeitraum */}
      <div className="bg-stone-50 rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => setType("single")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
            type === "single"
              ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm"
              : "bg-stone-50 text-stone-700 border-transparent hover:bg-stone-100"
          }`}
        >
          Einzeltag
        </button>

        <button
          type="button"
          onClick={() => setType("range")}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
            type === "range"
              ? "bg-amber-100 text-amber-900 border-amber-500 shadow-sm"
              : "bg-stone-50 text-stone-700 border-transparent hover:bg-stone-100"
          }`}
        >
          Zeitraum
        </button>
      </div>

      {/* Datum */}
      <div className="space-y-3">
        {type === "single" ? (
          <div className="flex flex-col">
            <label className="text-xs text-stone-600 mb-1">Datum</label>
            <input
              type="date"
              value={dateFrom}
              min={todayIso}        // <= hier wird Vergangenheit blockiert
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-stone-600 mb-1">Von</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-stone-600 mb-1">Bis</label>
              <input
                type="date"
                value={dateTo}
                min={todayIso}      // <= Enddatum darf nicht Vergangenheit sein
                onChange={(e) => setDateTo(e.target.value)}
                className="p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grund */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
          Grund
        </p>

        <div className="grid grid-cols-2 gap-2">
          <ReasonButton value="krankheit" label="Krank" />
          <ReasonButton value="urlaub" label="Urlaub" />
          <ReasonButton value="termin" label="Termin" />
          <ReasonButton value="sonstiges" label="Sonstiges" />
        </div>

        {reason === "sonstiges" && (
          <div className="mt-2">
            <label className="text-xs text-stone-600 mb-1 block">
              Sonstiger Grund (optional)
            </label>
            <textarea
              rows={2}
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm resize-none"
              placeholder="Kurz den Grund ergänzen …"
            />
          </div>
        )}
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
            className="px-4 py-2 bg-stone-200 text-stone-700 rounded-xl font-semibold text-sm hover:bg-stone-300"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}