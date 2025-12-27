// src/components/profile/ProfileSecurity.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Fingerprint,
  Mail,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import ProfileDeleteConfirm from "./ProfileDeleteConfirm";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  deleteCredentials,
} from "../../lib/biometricAuth";

export default function ProfileSecurity({
  user,
  onBack,
  onUpdateUser,
  onDeleteAccount,
}) {
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Email-Änderung States
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Native Biometrie States
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState("Biometrie");
  const [biometric, setBiometric] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(true);

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Aktuelle Email laden
  useEffect(() => {
    async function loadCurrentEmail() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        setCurrentEmail(authUser.email);
      }
    }
    loadCurrentEmail();
  }, []);

  // Biometrie-Status beim Laden prüfen
  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available.available);
      if (available.biometryTypeName) {
        setBiometricTypeName(available.biometryTypeName);
      }

      const enabled = await isBiometricEnabled();
      setBiometric(enabled);
      setBiometricLoading(false);
    }
    checkBiometric();
  }, []);

  const toggleBiometric = async () => {
    if (biometric) {
      // Deaktivieren: Credentials löschen
      await deleteCredentials();
      setBiometric(false);
    } else {
      // Aktivieren: Hinweis anzeigen (muss beim nächsten Login aktiviert werden)
      setSuccess("Biometrie wird beim nächsten Login aktiviert.");
    }
  };

  // Email-Änderung Handler
  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail) {
      return setEmailError("Bitte neue E-Mail-Adresse eingeben.");
    }

    // Einfache Email-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return setEmailError("Bitte eine gültige E-Mail-Adresse eingeben.");
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return setEmailError("Die neue E-Mail-Adresse ist identisch mit der aktuellen.");
    }

    setEmailLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) throw updateError;

      setEmailSuccess(
        "Eine Bestätigungs-E-Mail wurde an die neue Adresse gesendet. " +
        "Bitte bestätige die Änderung über den Link in der E-Mail."
      );
      setNewEmail("");
    } catch (err) {
      console.error("Email-Änderung fehlgeschlagen:", err);
      if (err.message?.includes("already registered")) {
        setEmailError("Diese E-Mail-Adresse wird bereits verwendet.");
      } else {
        setEmailError(err.message || "E-Mail konnte nicht geändert werden.");
      }
    }

    setEmailLoading(false);
  };

  const handlePw = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPw1 || !newPw2) {
      return setError("Bitte beide Felder ausfüllen.");
    }
    if (newPw1.length < 6) {
      return setError("Passwort muss mindestens 6 Zeichen haben.");
    }
    if (newPw1 !== newPw2) {
      return setError("Passwörter stimmen nicht überein.");
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw1,
      });

      if (updateError) throw updateError;

      setSuccess("Passwort erfolgreich geändert.");
      setNewPw1("");
      setNewPw2("");
    } catch (err) {
      console.error("Passwort-Änderung fehlgeschlagen:", err);
      setError(err.message || "Passwort konnte nicht geändert werden.");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        className="flex items-center text-stone-500 dark:text-stone-400 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Sicherheit</h2>

      {/* BIOMETRIC */}
      <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${biometric ? "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300" : "bg-stone-100 dark:bg-stone-700 text-stone-400"}`}>
              <Fingerprint size={20} />
            </div>
            <div>
              <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">
                {biometricTypeName}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {biometricAvailable
                  ? "Schneller anmelden ohne Passwort"
                  : "Nicht verfügbar auf diesem Gerät"}
              </p>
            </div>
          </div>

          {biometricLoading ? (
            <Loader2 className="animate-spin text-stone-400" size={20} />
          ) : biometricAvailable ? (
            <button
              onClick={toggleBiometric}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                biometric
                  ? "bg-amber-500 text-white"
                  : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
              }`}
            >
              {biometric ? "AN" : "AUS"}
            </button>
          ) : (
            <span className="text-xs text-stone-400 bg-stone-100 dark:bg-stone-700 px-3 py-1.5 rounded-lg">
              Nicht verfügbar
            </span>
          )}
        </div>

        {biometric && (
          <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">
            Biometrie ist aktiviert. Sie können sich mit {biometricTypeName} anmelden.
          </p>
        )}
      </div>

      {/* EMAIL CHANGE */}
      <form
        onSubmit={handleEmailChange}
        className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
            <Mail size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">
              E-Mail-Adresse ändern
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Aktuell: {currentEmail || "..."}
            </p>
          </div>
        </div>

        <input
          type="email"
          placeholder="Neue E-Mail-Adresse"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100"
        />

        {emailError && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
            {emailError}
          </div>
        )}

        {emailSuccess && (
          <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
            {emailSuccess}
          </div>
        )}

        <button
          type="submit"
          disabled={emailLoading || !newEmail}
          className="w-full bg-stone-800 dark:bg-stone-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold hover:bg-stone-900 dark:hover:bg-stone-500 active:scale-[0.99] disabled:opacity-50"
        >
          {emailLoading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <Mail size={16} />
              E-Mail ändern
            </>
          )}
        </button>
      </form>

      {/* PW CHANGE */}
      <form
        onSubmit={handlePw}
        className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3"
      >
        <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">
          Passwort ändern
        </p>

        <input
          type="password"
          placeholder="Neues Passwort"
          value={newPw1}
          onChange={(e) => setNewPw1(e.target.value)}
          className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100"
          minLength={6}
        />
        <input
          type="password"
          placeholder="Neues Passwort wiederholen"
          value={newPw2}
          onChange={(e) => setNewPw2(e.target.value)}
          className="w-full p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100"
          minLength={6}
        />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold hover:bg-amber-600 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <Save size={16} />
              Passwort speichern
            </>
          )}
        </button>
      </form>

      {/* DELETE */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full bg-red-500 text-white rounded-xl py-3 font-bold hover:bg-red-600 active:scale-[0.99]"
      >
        Profil löschen
      </button>

      {confirmDelete && (
        <ProfileDeleteConfirm
          user={user}
          onCancel={() => setConfirmDelete(false)}
          onDelete={() => {
            setConfirmDelete(false);
            onDeleteAccount();
          }}
        />
      )}
    </div>
  );
}
