// src/components/ui/SaveButton.jsx
import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export default function SaveButton({
  onClick,
  isDirty,
  label = "Speichern",
  saveDuration = 800,     // wie lange der Spinner sichtbar bleibt
  savedDuration = 1400,   // wie lange der grüne Zustand sichtbar bleibt
}) {
  const [state, setState] = useState("idle"); 
  // idle | saving | saved

  const handleClick = async () => {
    if (!isDirty || state === "saving") return;

    setState("saving");

    // Speichern ausführen
    try {
      await onClick();
    } catch (err) {
      console.error("Save error:", err);
    }

    // nach kurzer Spinnerzeit → saved-State
    setTimeout(() => {
      setState("saved");

      // und erst danach zurück zu idle
      setTimeout(() => {
        setState("idle");
      }, savedDuration);

    }, saveDuration);
  };

  const base =
    "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2";

  let variant = "";
  let content = null;

  if (!isDirty && state === "idle") {
    // DISABLED Zustand
    variant = "bg-stone-300 text-stone-500 cursor-not-allowed";
    content = <span>{label}</span>;
  } 
  
  else if (state === "idle") {
    // NORMAL
    variant = "bg-amber-600 hover:bg-amber-700 active:scale-95 text-white";
    content = <span>{label}</span>;
  } 
  
  else if (state === "saving") {
    // SAVING
    variant = "bg-amber-500 text-white cursor-wait";
    content = (
      <>
        <Loader2 size={18} className="animate-spin" />
        <span>Speichern…</span>
      </>
    );
  } 
  
  else if (state === "saved") {
    // SUCCESS ✓ — wie im Speiseplan
    variant =
      "bg-emerald-600 text-white animate-[pop_0.25s_ease-out]"; // kleiner Pop
    content = (
      <>
        <Check size={20} />
        <span>Gespeichert</span>
      </>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isDirty && state === "idle"}
      className={`${base} ${variant}`}
    >
      {content}
    </button>
  );
}

/* 
POP animation
Kannst du in global.css ergänzen, falls du die Animation willst:

@keyframes pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}

*/