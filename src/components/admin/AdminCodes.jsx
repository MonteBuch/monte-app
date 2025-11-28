// src/components/admin/AdminCodes.jsx
import React, { useEffect, useState } from "react";
import { KeyRound, Info } from "lucide-react";
import { StorageService } from "../../lib/storage";
import SaveButton from "../ui/SaveButton";

export default function AdminCodes() {
  const [codes, setCodes] = useState({
    parent: "",
    team: "",
    admin: "",
  });

  const [initial, setInitial] = useState(codes);

  /* -------------------------------------------------------------
     LOAD — Codes aus facilitySettings laden
     ------------------------------------------------------------- */
  useEffect(() => {
    const facility = StorageService.getFacilitySettings() || {};

    const loaded = {
      parent: facility?.codes?.parent || "",
      team: facility?.codes?.team || "",
      admin: facility?.codes?.admin || "",
    };

    setCodes(loaded);
    setInitial(loaded);
  }, []);

  const changed = JSON.stringify(codes) !== JSON.stringify(initial);

  /* -------------------------------------------------------------
     CHANGE HANDLER
     ------------------------------------------------------------- */
  const update = (key, value) => {
    setCodes((prev) => ({
      ...prev,
      [key]: value.trim(),
    }));
  };

  /* -------------------------------------------------------------
     SAVE — facilitySettings aktualisieren
     ------------------------------------------------------------- */
  const save = async () => {
    const facility = StorageService.getFacilitySettings() || {};

    const updated = {
      ...facility,
      codes: {
        parent: codes.parent.trim(),
        team: codes.team.trim(),
        admin: codes.admin.trim(),
      },
    };

    StorageService.saveFacilitySettings(updated);
    setInitial(updated.codes);
  };

  /* -------------------------------------------------------------
     UI
     ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800">Zugangscodes</h2>

      {/* Hinweisbox */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <Info size={18} />
        <p>
          Änderungen an den Codes beeinflussen nur **neue Registrierungen**.  
          Bereits bestehende Profile bleiben unverändert.
        </p>
      </div>

      {/* Parent Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Eltern-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.parent}
          onChange={(e) => update("parent", e.target.value)}
          placeholder="z. B. PARENT-2024"
        />
      </div>

      {/* Team Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Team-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.team}
          onChange={(e) => update("team", e.target.value)}
          placeholder="z. B. TEAM-2024"
        />
      </div>

      {/* Admin Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Admin-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.admin}
          onChange={(e) => update("admin", e.target.value)}
          placeholder="z. B. ADMIN-2024"
        />
      </div>

      {/* SAVE BUTTON */}
      <SaveButton
        isDirty={changed}
        onClick={save}
        label="Codes speichern"
      />
    </div>
  );
}