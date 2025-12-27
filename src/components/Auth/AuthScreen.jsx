import React, { useState, useEffect } from "react";
import {
  Sprout,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  CalendarDays,
  StickyNote,
  Link2,
  CheckCircle,
  Fingerprint,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
import { useFacility } from "../../context/FacilityContext";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  authenticateWithBiometric,
  saveCredentials,
} from "../../lib/biometricAuth";

// Test-Modus Passwort (nur für Entwicklung)
const TEST_MASTER_PASSWORD = "454745";

// Password-Validierung
function validatePassword(password) {
  // Test-Passwort erlauben (für Entwicklung)
  if (password === TEST_MASTER_PASSWORD) {
    return [];
  }

  const errors = [];
  if (password.length < 8) {
    errors.push("Passwort muss mindestens 8 Zeichen haben.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Großbuchstaben enthalten.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Kleinbuchstaben enthalten.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Passwort muss mindestens eine Zahl enthalten.");
  }
  return errors;
}

// Password-Stärke berechnen
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return { label: "Schwach", color: "bg-red-500", width: "33%" };
  if (strength <= 4) return { label: "Mittel", color: "bg-amber-500", width: "66%" };
  return { label: "Stark", color: "bg-green-500", width: "100%" };
}

export default function AuthScreen({ onLogin }) {
  const { facility } = useFacility();
  const [isRegistering, setIsRegistering] = useState(false);

  const [role, setRole] = useState("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");


  // Einladungslink-System
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteRole, setInviteRole] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const defaultGroupId = groups.find(g => g.id !== "event")?.id || null;

  const [children, setChildren] = useState([]);
  // Stammgruppe für Team-Mitglieder
  const [primaryGroup, setPrimaryGroup] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showInvitePopup, setShowInvitePopup] = useState(false);

  // Biometrie States
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState("Biometrie");
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  // Biometrie-Status prüfen
  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available.available);
      if (available.biometryTypeName) {
        setBiometricTypeName(available.biometryTypeName);
      }

      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
    }
    checkBiometric();
  }, []);

  // Einladungslink aus URL prüfen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");

    if (token) {
      setInviteToken(token);
      setInviteChecking(true);
      setIsRegistering(true);

      // Token validieren
      supabase.rpc("validate_invite_link", { p_token: token })
        .then(({ data, error }) => {
          if (error) {
            console.error("Invite validation error:", error);
            setError("Einladungslink konnte nicht validiert werden.");
            setInviteChecking(false);
            return;
          }

          if (data && data.length > 0) {
            const result = data[0];
            if (result.valid) {
              setInviteValid(true);
              setInviteRole(result.role);
              setRole(result.role);
              // URL bereinigen ohne Reload
              window.history.replaceState({}, "", window.location.pathname);
            } else {
              setError(result.error_message || "Ungültiger Einladungslink");
              setInviteToken(null);
            }
          }
          setInviteChecking(false);
        });
    }
  }, []);

  // Gruppen aus Supabase laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");

        if (error) throw error;
        setGroups(data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Gruppen:", err);
      } finally {
        setLoadingGroups(false);
      }
    }
    loadGroups();
  }, []);

  // Default-Kind setzen wenn Gruppen geladen
  useEffect(() => {
    if (groups.length > 0 && children.length === 0) {
      const firstGroup = groups.find(g => !g.is_event_group) || groups[0];
      setChildren([{
        id: crypto.randomUUID(),
        name: "",
        group: firstGroup?.id || null,
        birthday: "",
        notes: "",
      }]);
      // Auch primaryGroup für Team setzen
      if (!primaryGroup) {
        setPrimaryGroup(firstGroup?.id || null);
      }
    }
  }, [groups]);

  const handleAddChild = () => {
    const firstGroup = groups.find(g => !g.is_event_group) || groups[0];
    setChildren((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        group: firstGroup?.id || null,
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
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // Biometrie-Login
  const handleBiometricLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const credentials = await authenticateWithBiometric();

      // Mit Supabase einloggen
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        throw new Error("Zugangsdaten ungültig. Bitte erneut anmelden.");
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Login fehlgeschlagen.");
      }

      const userData = await loadUserProfile(userId);
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Biometrie aktivieren (nach erfolgreichem Login)
  const handleEnableBiometric = async () => {
    if (!pendingCredentials) return;

    try {
      await saveCredentials(pendingCredentials.email, pendingCredentials.password);
      setBiometricEnabled(true);
    } catch (err) {
      console.error("Failed to enable biometric:", err);
    }

    // Login abschließen
    setShowBiometricPrompt(false);
    onLogin(pendingCredentials.userData);
  };

  // Biometrie überspringen
  const handleSkipBiometric = () => {
    setShowBiometricPrompt(false);
    if (pendingCredentials?.userData) {
      onLogin(pendingCredentials.userData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // === REGISTRIERUNG ===
        if (!email || !password || !name) {
          throw new Error("Bitte alle Pflichtfelder ausfüllen.");
        }

        // Password Policy Validation
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
          throw new Error(passwordErrors[0]);
        }

        // Authentifizierung: Einladungslink erforderlich
        if (!inviteValid || !inviteToken) {
          throw new Error("Registrierung nur mit gültigem Einladungslink möglich.");
        }

        // Kinder validieren (bei Eltern)
        if (role === "parent") {
          if (children.length === 0) {
            throw new Error("Bitte mindestens ein Kind hinzufügen.");
          }
          const invalidChild = children.find(c => !c.name || !c.group);
          if (invalidChild) {
            throw new Error("Bitte für jedes Kind Name und Gruppe angeben.");
          }
        }

        // 1. Auth-User erstellen (mit Name in Metadaten für Email-Template)
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            throw new Error("Diese E-Mail ist bereits registriert.");
          }
          throw signUpError;
        }

        const userId = authData.user?.id;
        if (!userId) {
          throw new Error("Registrierung fehlgeschlagen. Bitte erneut versuchen.");
        }

        // 2. Profil erstellen oder updaten (Trigger erstellt evtl. schon ein leeres Profil)
        // Für Team: Die ausgewählte Stammgruppe verwenden
        const selectedPrimaryGroup = role === "parent" ? null : primaryGroup;

        // Erst versuchen zu updaten (falls Trigger das Profil schon erstellt hat)
        const userEmail = email.toLowerCase().trim();
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            facility_id: FACILITY_ID,
            full_name: name,
            role,
            primary_group: selectedPrimaryGroup,
            email: userEmail,
          })
          .eq("id", userId);

        if (updateError) {
          // Falls Update fehlschlägt, versuche Insert
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              facility_id: FACILITY_ID,
              full_name: name,
              role,
              primary_group: selectedPrimaryGroup,
              email: userEmail,
            });

          if (insertError) {
            console.error("Profil-Fehler:", insertError);
            throw new Error("Profil konnte nicht erstellt werden.");
          }
        }

        // 3. Kinder erstellen (bei Eltern)
        // Verwendet SECURITY DEFINER Funktion, da User noch keine Session hat
        if (role === "parent" && children.length > 0) {
          const childrenData = children.map(c => ({
            first_name: c.name,
            group_id: c.group,
            birthday: c.birthday || null,
            notes: c.notes || null,
          }));

          const { data: childResult, error: childrenError } = await supabase.rpc(
            "register_children",
            {
              p_user_id: userId,
              p_facility_id: FACILITY_ID,
              p_children: childrenData,
            }
          );

          if (childrenError) {
            console.error("Kinder konnten nicht erstellt werden:", childrenError);
          } else if (childResult && !childResult.success) {
            console.error("Kinder-Registrierung fehlgeschlagen:", childResult.error);
          }
        }

        // 4. Einladungslink als verwendet markieren
        if (inviteValid && inviteToken) {
          await supabase.rpc("use_invite_link", { p_token: inviteToken });
        }

        // 5. Prüfen ob Email-Bestätigung erforderlich ist
        // Wenn session null ist, muss der User erst seine Email bestätigen
        if (!authData.session) {
          setRegistrationSuccess(true);
          setLoading(false);
          return; // WICHTIG: Nicht onLogin() aufrufen!
        }

        // 6. User-Daten für App laden (nur wenn Session vorhanden)
        const userData = await loadUserProfile(userId);
        onLogin(userData);

      } else {
        // === LOGIN ===
        const userEmail = email.toLowerCase().trim();

        // Zuerst prüfen ob User Force-Reset Flag hat
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("id, must_reset_password, email")
          .eq("email", userEmail)
          .single();

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (signInError) {
          // Wenn Login fehlschlägt UND Force-Reset aktiv ist → Reset-Email senden
          if (profileCheck?.must_reset_password) {
            // Reset-Email senden
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
              redirectTo: window.location.origin,
            });

            if (resetError) {
              throw new Error("Passwort-Reset E-Mail konnte nicht gesendet werden.");
            }

            throw new Error("Dein Passwort wurde von der Leitung zurückgesetzt. Eine E-Mail mit einem Link zum Setzen eines neuen Passworts wurde an dich gesendet.");
          }

          // Email noch nicht bestätigt
          if (signInError.message.includes("Email not confirmed")) {
            throw new Error("Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir eine Bestätigungs-E-Mail gesendet. Prüfe auch deinen Spam-Ordner.");
          }

          if (signInError.message.includes("Invalid login")) {
            throw new Error("Ungültige Zugangsdaten.");
          }
          throw signInError;
        }

        const userId = authData.user?.id;
        if (!userId) {
          throw new Error("Login fehlgeschlagen.");
        }

        // User-Daten laden
        const userData = await loadUserProfile(userId);

        // Biometrie-Prompt zeigen (wenn verfügbar und noch nicht aktiviert)
        if (biometricAvailable && !biometricEnabled) {
          setPendingCredentials({ email: userEmail, password, userData });
          setShowBiometricPrompt(true);
          setLoading(false);
          return;
        }

        onLogin(userData);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // User-Profil aus Supabase laden
  const loadUserProfile = async (userId) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        primary_group,
        facility_id,
        must_reset_password,
        children (
          id,
          first_name,
          birthday,
          notes,
          group_id
        )
      `)
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Format für App (Kompatibilität mit bestehendem Code)
    return {
      id: profile.id,
      name: profile.full_name,
      role: profile.role,
      primaryGroup: profile.primary_group,
      facilityId: profile.facility_id,
      mustResetPassword: profile.must_reset_password || false,
      children: (profile.children || []).map(c => ({
        id: c.id,
        name: c.first_name,
        group: c.group_id,
        birthday: c.birthday,
        notes: c.notes,
      })),
    };
  };

  // Gruppen für Anzeige filtern (ohne Event-Gruppe)
  const displayGroups = groups.filter(g => !g.is_event_group);

  return (
    <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md py-10">
        {/* LOGO */}
        <div className="text-center mb-6">
          {facility.logo_url ? (
            <img
              src={facility.logo_url}
              alt={facility.display_name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4 shadow-lg"
            />
          ) : (
            <div className="bg-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sprout className="text-white" size={32} />
            </div>
          )}
          <h1 className="text-2xl font-bold text-stone-800">
            {facility.display_name}
          </h1>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-stone-100">
          {/* Biometrie-Aktivierungs-Dialog */}
          {showBiometricPrompt ? (
            <div className="text-center space-y-4">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Fingerprint className="text-amber-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-800">
                {biometricTypeName} aktivieren?
              </h2>
              <p className="text-stone-600">
                Melde dich beim nächsten Mal schneller an - mit deinem {biometricTypeName}.
              </p>
              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleEnableBiometric}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 flex items-center justify-center gap-2"
                >
                  <Fingerprint size={20} />
                  Ja, aktivieren
                </button>
                <button
                  type="button"
                  onClick={handleSkipBiometric}
                  className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200"
                >
                  Später
                </button>
              </div>
            </div>
          ) : registrationSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-800">
                Registrierung erfolgreich!
              </h2>
              <p className="text-stone-600">
                Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
              </p>
              <p className="text-sm text-stone-500">
                Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
                Danach kannst du dich hier anmelden.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setIsRegistering(false);
                    setPassword("");
                  }}
                  className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-900"
                >
                  Zum Login
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-4">
                Keine E-Mail erhalten? Prüfe deinen Spam-Ordner oder versuche es erneut.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-stone-700">
                  {isRegistering ? "Registrieren" : "Anmelden"}
                </h2>
                {isRegistering ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setError("");
                    }}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    Zum Login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowInvitePopup(true)}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    Konto erstellen
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
            {/* Registrierung */}
            {isRegistering && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                    Anzeigename
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                    placeholder="So wirst du in der App angezeigt"
                  />
                </div>

                {/* Einladungslink-Anzeige */}
                {inviteValid ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Einladungslink gültig
                      </p>
                      <p className="text-xs text-green-600">
                        Du wurdest als {inviteRole === "parent" ? "Elternteil" : inviteRole === "team" ? "Team-Mitglied" : "Admin"} eingeladen.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <Link2 className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Einladungslink erforderlich
                      </p>
                      <p className="text-xs text-amber-600">
                        Bitte fordere einen Einladungslink von der Einrichtung an.
                      </p>
                    </div>
                  </div>
                )}

                {/* STAMMGRUPPE für Team */}
                {(role === "team" || role === "admin") && !loadingGroups && displayGroups.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
                      Deine Stammgruppe
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {displayGroups.map((g) => {
                        const styles = getGroupStyles(g);
                        return (
                          <button
                            type="button"
                            key={g.id}
                            onClick={() => setPrimaryGroup(g.id)}
                            className={`p-3 rounded-xl text-sm flex items-center justify-center gap-2 border ${
                              primaryGroup === g.id
                                ? `${styles.chipClass} border-transparent shadow-sm`
                                : "bg-white border-stone-200 text-stone-500 hover:bg-stone-100"
                            }`}
                          >
                            <styles.Icon size={16} /> {styles.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KINDER */}
                {role === "parent" && !loadingGroups && (
                  <>
                    <label className="block text-xs font-bold text-stone-400 uppercase mt-4 mb-1">
                      Deine Kinder
                    </label>

                    {children.map((child, index) => {
                      const group = displayGroups.find(g => g.id === child.group);
                      const groupStyles = getGroupStyles(group);

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
                          <div>
                            <label className="block text-xs text-stone-500 mb-1">
                              Gruppe auswählen
                            </label>
                            {displayGroups.length === 0 ? (
                              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                                Gruppen werden geladen...
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {displayGroups.map((g) => {
                                  const styles = getGroupStyles(g);

                                  return (
                                    <button
                                      type="button"
                                      key={g.id}
                                      onClick={() =>
                                        handleChildChange(index, "group", g.id)
                                      }
                                      className={`p-2 rounded-lg text-xs flex items-center justify-center gap-1 border ${
                                        child.group === g.id
                                          ? `${styles.chipClass} border-transparent shadow-sm`
                                          : "bg-white border-stone-200 text-stone-500 hover:bg-stone-100"
                                      }`}
                                    >
                                      <styles.Icon size={12} /> {styles.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
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
                                handleChildChange(
                                  index,
                                  "birthday",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm"
                            />
                          </div>

                          {/* Hinweise */}
                          <div>
                            <label className="block text-xs text-stone-500 mb-1 flex items-center gap-1">
                              <StickyNote size={12} /> Hinweise / Allergien
                              (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={child.notes || ""}
                              onChange={(e) =>
                                handleChildChange(
                                  index,
                                  "notes",
                                  e.target.value
                                )
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

            {/* E-MAIL / PASSWORT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                  E-Mail
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                  placeholder="name@beispiel.de"
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
                {/* Password-Anforderungen (bei Registrierung immer sichtbar) */}
                {isRegistering && (
                  <div className="mt-2 space-y-2">
                    {/* Anforderungen-Liste */}
                    <div className="text-xs text-stone-500 bg-stone-50 p-2 rounded-lg">
                      <p className="font-semibold mb-1">Passwort-Anforderungen:</p>
                      <ul className="space-y-0.5">
                        <li className={password.length >= 8 ? "text-green-600" : ""}>
                          {password.length >= 8 ? "✓" : "○"} Mindestens 8 Zeichen
                        </li>
                        <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                          {/[A-Z]/.test(password) ? "✓" : "○"} Ein Großbuchstabe (A-Z)
                        </li>
                        <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                          {/[a-z]/.test(password) ? "✓" : "○"} Ein Kleinbuchstabe (a-z)
                        </li>
                        <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                          {/[0-9]/.test(password) ? "✓" : "○"} Eine Zahl (0-9)
                        </li>
                      </ul>
                    </div>
                    {/* Stärke-Balken */}
                    {password.length > 0 && (
                      <div>
                        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrength(password).color} transition-all duration-300`}
                            style={{ width: getPasswordStrength(password).width }}
                          />
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          Stärke: {getPasswordStrength(password).label}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                <AlertTriangle size={16} className="mt-0.5" />
                {error}
              </div>
            )}

            <button
              disabled={loading || loadingGroups}
              type="submit"
              className="w-full bg-stone-800 text-white font-bold py-4 rounded-xl hover:bg-stone-900 mt-4 flex justify-center shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isRegistering ? (
                "Konto erstellen"
              ) : (
                "Anmelden"
              )}
            </button>

            {/* Biometrie-Login Button (nur im Login-Modus wenn aktiviert) */}
            {!isRegistering && biometricEnabled && (
              <button
                type="button"
                disabled={loading}
                onClick={handleBiometricLogin}
                className="w-full mt-3 bg-amber-50 border-2 border-amber-200 text-amber-700 font-bold py-3 rounded-xl hover:bg-amber-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Fingerprint size={20} />
                Mit {biometricTypeName} anmelden
              </button>
            )}
          </form>
            </>
          )}
        </div>
      </div>

      {/* Einladungslink-Popup */}
      {showInvitePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <Link2 className="text-amber-600" size={28} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-800 text-center mb-2">
              Einladungslink erforderlich
            </h3>
            <p className="text-sm text-stone-600 text-center mb-6">
              Bitte fordern Sie einen Einladungslink von der Einrichtung an, um ein Konto zu erstellen.
            </p>
            <button
              type="button"
              onClick={() => setShowInvitePopup(false)}
              className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-900"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
