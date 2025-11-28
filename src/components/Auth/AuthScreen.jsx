// src/components/AuthScreen.jsx
import React, { useState } from "react";
import {
  Sprout,
  KeyRound,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  Shield,
  CalendarDays,
  StickyNote,
} from "lucide-react";
import { StorageService } from "../../lib/storage";
import {
  GROUPS,
  DEFAULT_PARENT_CODE,
  DEFAULT_TEAM_CODE,
  DEFAULT_ADMIN_CODE,
} from "../../lib/constants";

export default function AuthScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const [role, setRole] = useState("parent");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [parentCode, setParentCode] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const [children, setChildren] = useState([
    {
      id: crypto.randomUUID(),
      name: "",
      group: "erde",
      birthday: "",
      notes: "",
    },
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const facility = StorageService.getFacilitySettings();
  const expectedParentCode = facility.codes.parent || DEFAULT_PARENT_CODE;
  const expectedTeamCode = facility.codes.team || DEFAULT_TEAM_CODE;
  const expectedAdminCode = facility.codes.admin || DEFAULT_ADMIN_CODE;

  const handleAddChild = () => {
    setChildren((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        group: "erde",
        birthday: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveChild = (index) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index, field, value) => {
    setChildren((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 250));

    try {
      if (isRegistering) {
        if (!username || !password || !name) {
          throw new Error("Bitte alle Pflichtfelder ausfüllen.");
        }

        if (role === "parent" && parentCode !== expectedParentCode) {
          throw new Error("Falscher Eltern-Code.");
        }
        if (role === "team" && teamCode !== expectedTeamCode) {
          throw new Error("Falscher Team-Code.");
        }
        if (role === "admin" && adminCode !== expectedAdminCode) {
          throw new Error("Falscher Admin-Code.");
        }

        const allUsers = StorageService.get("users") || [];
        if (allUsers.find((u) => u.username === username)) {
          throw new Error("Benutzername ist bereits vergeben.");
        }

        const newUser = {
          id: crypto.randomUUID(),
          username,
          password,
          name,
          role,
          children: role === "parent" ? children : [],
          primaryGroup:
            role === "team" || role === "admin" ? "erde" : null,
        };

        StorageService.add("users", newUser);
        onLogin(newUser);
      } else {
// LOGIN
const allUsers = StorageService.get("users") || [];
const found = allUsers.find(
  (u) => u.username.toLowerCase() === username.toLowerCase()
);

if (!found) {
  throw new Error("Ungültige Zugangsdaten.");
}

// Passwort-Reset aktiv → Passwort NICHT prüfen
if (found.mustResetPassword) {
  onLogin({
    ...found,
    forceReset: true, // Signal an App.jsx, ForceReset-Screen anzeigen
  });
  return;
}

// Kein Reset → Passwort normal prüfen
if (found.password !== password) {
  throw new Error("Ungültige Zugangsdaten.");
}

onLogin(found);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md py-10">
        {/* LOGO */}
        <div className="text-center mb-6">
          <div className="bg-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sprout className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">
            Montessori Kinderhaus
          </h1>
          <p className="text-stone-500 text-sm italic mt-1">
            Berlin-Buch
          </p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-700">
              {isRegistering ? "Registrieren" : "Anmelden"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsRegistering((v) => !v);
                setError("");
              }}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              {isRegistering ? "Zum Login" : "Konto erstellen"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Registrierung */}
            {isRegistering && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                    Vollständiger Name
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                  />
                </div>

                {/* Rollen */}
                <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setRole("parent")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "parent"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Elternteil
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("team")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "team"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Kita-Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "admin"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Admin
                  </button>
                </div>

                {/* Codes */}
                {role === "parent" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <KeyRound size={12} /> Eltern-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={parentCode}
                      onChange={(e) => setParentCode(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                    />
                  </div>
                )}

                {role === "team" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <KeyRound size={12} /> Team-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                    />
                  </div>
                )}

                {role === "admin" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <Shield size={12} /> Admin-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      className="w-full p-3 bg-amber-50 rounded-xl border border-amber-200"
                    />
                  </div>
                )}

                {/* KINDER nur bei Eltern */}
                {role === "parent" && (
                  <>
                    <label className="block text-xs font-bold text-stone-400 uppercase mt-4 mb-1">
                      Ihre Kinder
                    </label>

                    {children.map((child, index) => {
                      const groupObj = GROUPS.find((g) => g.id === child.group);

                      return (
                        <div
                          key={child.id}
                          className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 relative"
                        >
                          {children.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChild(index)}
                              className="absolute top-2 right-2 bg-white p-1 rounded-full text-stone-400 hover:text-red-500 shadow-sm"
                            >
                              <X size={14} />
                            </button>
                          )}

                          {/* Name */}
                          <input
                            required
                            type="text"
                            placeholder="Vorname"
                            value={child.name}
                            onChange={(e) =>
                              handleChildChange(index, "name", e.target.value)
                            }
                            className="w-full p-2 bg-white rounded-lg text-sm border border-stone-200"
                          />

                          {/* Gruppe */}
                          <div className="grid grid-cols-2 gap-2">
                            {GROUPS.map((g) => (
                              <button
                                type="button"
                                key={g.id}
                                onClick={() =>
                                  handleChildChange(index, "group", g.id)
                                }
                                className={`p-2 rounded-lg text-xs flex items-center justify-center gap-1 border ${
                                  child.group === g.id
                                    ? `${g.color} border-transparent shadow-sm`
                                    : "bg-white border-stone-200 text-stone-500 hover:bg-stone-100"
                                }`}
                              >
                                {g.icon} {g.name}
                              </button>
                            ))}
                          </div>

                          {/* Geburtstag */}
                          <div>
                            <label className="block text-xs text-stone-500 mb-1 flex items-center gap-1">
                              <CalendarDays size={12} /> Geburtstag (optional)
                            </label>
                            <input
                              type="date"
                              value={child.birthday || ""}
                              onChange={(e) =>
                                handleChildChange(index, "birthday", e.target.value)
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm"
                            />
                          </div>

                          {/* Hinweise */}
                          <div>
                            <label className="block text-xs text-stone-500 mb-1 flex items-center gap-1">
                              <StickyNote size={12} /> Hinweise / Allergien (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={child.notes || ""}
                              onChange={(e) =>
                                handleChildChange(index, "notes", e.target.value)
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm resize-none"
                              placeholder="Allergien oder Hinweise"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-bold rounded-xl flex justify-center items-center gap-1 hover:bg-amber-50"
                    >
                      <Plus size={16} /> Kind hinzufügen
                    </button>
                  </>
                )}
              </>
            )}

            {/* LOGIN / PW */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                  Benutzername
                </label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                  Passwort
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                />
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                <AlertTriangle size={16} className="mt-0.5" />
                {error}
              </div>
            )}

            {/* BUTTON */}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-stone-800 text-white font-bold py-4 rounded-xl hover:bg-stone-900 mt-4 flex justify-center shadow-md"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isRegistering ? (
                "Konto erstellen"
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}