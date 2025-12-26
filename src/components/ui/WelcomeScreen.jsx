// src/components/ui/WelcomeScreen.jsx
import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Home,
  Users,
  CalendarDays,
  MessageCircle,
  UtensilsCrossed,
  Calendar,
  Bell,
  Sparkles,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";

// Slide-Konfiguration für Eltern
const PARENT_SLIDES = [
  {
    icon: Sparkles,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Willkommen!",
    subtitle: "Schön, dass du dabei bist",
    description:
      "Die Monte-App verbindet dich mit der Kita deines Kindes. Hier findest du alle wichtigen Informationen und Funktionen an einem Ort.",
  },
  {
    icon: Home,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Pinnwand",
    subtitle: "Immer auf dem Laufenden",
    description:
      "Auf der Pinnwand findest du alle Neuigkeiten und Mitteilungen der Kita. Du siehst nur Beiträge, die für die Gruppe(n) deines Kindes relevant sind. Mit einem Herz zeigst du, dass dir ein Beitrag gefällt.",
  },
  {
    icon: Users,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Gruppenbereich",
    subtitle: "Listen & Abstimmungen",
    description:
      "Im Gruppenbereich findest du Mitbringlisten, Abstimmungen und Dienstlisten. Trage dich ein oder stimme ab - einfach und unkompliziert.",
  },
  {
    icon: CalendarDays,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Abwesenheiten",
    subtitle: "Meldungen leicht gemacht",
    description:
      "Melde Krankheit, Urlaub oder sonstige Abwesenheiten deines Kindes direkt in der App. Das Team wird automatisch benachrichtigt.",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    title: "Gruppenchat",
    subtitle: "Mit anderen Eltern vernetzen",
    description:
      "Tausche dich im Gruppenchat mit anderen Eltern aus. Du entscheidest selbst, ob du teilnehmen möchtest - aktiviere ihn jederzeit im Chat-Bereich.",
  },
  {
    icon: Bell,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    title: "Benachrichtigungen",
    subtitle: "Nichts mehr verpassen",
    description:
      "Stelle in deinem Profil ein, worüber du benachrichtigt werden möchtest - per E-Mail, Push oder beides. So verpasst du keine wichtigen Updates.",
  },
];

// Slide-Konfiguration für Team
const TEAM_SLIDES = [
  {
    icon: Sparkles,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Willkommen im Team!",
    subtitle: "Schön, dass du dabei bist",
    description:
      "Die Monte-App unterstützt dich bei der täglichen Arbeit. Hier findest du alle wichtigen Funktionen für die Kommunikation mit den Eltern.",
  },
  {
    icon: Home,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Pinnwand",
    subtitle: "Mitteilungen erstellen",
    description:
      "Erstelle Beiträge für Eltern - wähle dabei aus, welche Gruppen die Nachricht sehen sollen. Du kannst Texte, Bilder und Anhänge hinzufügen.",
  },
  {
    icon: Users,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Gruppenbereich",
    subtitle: "Listen verwalten",
    description:
      "Erstelle und verwalte Mitbringlisten, Abstimmungen und Dienstlisten. Du siehst alle Einträge und Abstimmungsergebnisse deiner Gruppen.",
  },
  {
    icon: CalendarDays,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Abwesenheiten",
    subtitle: "Meldungen im Überblick",
    description:
      "Sieh alle Abwesenheitsmeldungen deiner Gruppen auf einen Blick. Du kannst auf Meldungen antworten und Rückmeldung an die Eltern geben.",
  },
  {
    icon: Calendar,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    title: "Terminübersicht",
    subtitle: "Jahresplanung im Blick",
    description:
      "Die Terminübersicht zeigt alle wichtigen Termine der Kita - von Schließtagen bis zu Festen. So behältst du immer den Überblick.",
  },
];

// Slide-Konfiguration für Admin
const ADMIN_SLIDES = [
  {
    icon: Sparkles,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Willkommen!",
    subtitle: "Leitung der Monte-App",
    description:
      "Als Leitung hast du Zugriff auf alle Verwaltungsfunktionen. Hier eine kurze Übersicht der wichtigsten Bereiche.",
  },
  {
    icon: Home,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Pinnwand",
    subtitle: "Kommunikation mit allen",
    description:
      "Erstelle Mitteilungen für alle Eltern oder einzelne Gruppen. Sowohl Leitung als auch Team können Beiträge für die gesamte Einrichtung verfassen.",
  },
  {
    icon: CalendarDays,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Abwesenheits-Dashboard",
    subtitle: "Alle Meldungen im Blick",
    description:
      "Im Dashboard siehst du alle Abwesenheitsmeldungen aller Gruppen. Behalte den Überblick und reagiere auf Eltern-Meldungen.",
  },
  {
    icon: Calendar,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    title: "Terminverwaltung",
    subtitle: "Jahresplanung pflegen",
    description:
      "Pflege die Termine für das ganze Jahr - von Schließtagen über Teamtage bis zu Festen. Eltern und Team sehen diese in ihrer Übersicht.",
  },
  {
    icon: Users,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Adminbereich",
    subtitle: "Volle Kontrolle",
    description:
      "Verwalte Benutzer, Gruppen, Einladungslinks und Kinderakten. Alle administrativen Funktionen findest du im Adminbereich.",
  },
];

export default function WelcomeScreen({ user, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // Slides basierend auf Rolle wählen
  const slides =
    user.role === "admin"
      ? ADMIN_SLIDES
      : user.role === "team"
      ? TEAM_SLIDES
      : PARENT_SLIDES;

  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      handleComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsClosing(true);

    try {
      // In DB speichern, dass User Welcome gesehen hat
      const { error } = await supabase
        .from("profiles")
        .update({ has_seen_welcome: true })
        .eq("id", user.id);

      if (error) {
        console.error("Welcome-Status speichern fehlgeschlagen:", error);
        // Trotzdem fortfahren, aber Warnung loggen
      } else {
        console.log("[WelcomeScreen] has_seen_welcome erfolgreich gesetzt für User:", user.id);
      }
    } catch (err) {
      console.error("Welcome-Status speichern Exception:", err);
    }

    // Callback nach kurzer Animation
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all duration-300 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Skip Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={handleSkip}
            className="text-stone-400 hover:text-stone-600 text-sm font-medium flex items-center gap-1"
          >
            Überspringen
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 text-center">
          {/* Icon */}
          <div
            className={`w-20 h-20 ${slide.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}
          >
            <Icon size={40} className={slide.iconColor} />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-stone-800 mb-2">
            {slide.title}
          </h2>
          <p className="text-amber-600 font-semibold text-sm mb-4">
            {slide.subtitle}
          </p>

          {/* Description */}
          <p className="text-stone-600 text-sm leading-relaxed mb-8">
            {slide.description}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? "w-6 bg-amber-500"
                    : "bg-stone-300 hover:bg-stone-400"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} />
                Zurück
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 ${
                currentSlide === 0 ? "w-full" : ""
              }`}
            >
              {isLastSlide ? "Los geht's!" : "Weiter"}
              {!isLastSlide && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
