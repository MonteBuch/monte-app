// src/components/profile/ProfileFacility.jsx
import React from "react";
import { ArrowLeft, MapPin, Phone, Mail, Clock, Info } from "lucide-react";
import { StorageService } from "../../lib/storage";

export default function ProfileFacility({ onBack }) {
  const facility = StorageService.getFacilitySettings() || {};

  return (
    <div className="space-y-6">

      {/* Header mit Zurück */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 hover:text-stone-800 active:scale-95"
      >
        <ArrowLeft size={20} />
        <span className="font-semibold text-sm">Zurück</span>
      </button>

      {/* Titel */}
      <h2 className="text-lg font-bold text-stone-800">
        Einrichtungsinformationen
      </h2>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-5">

        {/* Name */}
        {facility.name && (
          <div className="flex items-start gap-3">
            <Info size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                Name der Einrichtung
              </p>
              <p className="text-sm text-stone-800 mt-1">{facility.name}</p>
            </div>
          </div>
        )}

        {/* Adresse */}
        {facility.address && (
          <div className="flex items-start gap-3">
            <MapPin size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                Adresse
              </p>
              <p className="text-sm text-stone-800 mt-1 whitespace-pre-wrap">
                {facility.address}
              </p>
            </div>
          </div>
        )}

        {/* Telefon */}
        {facility.phone && (
          <div className="flex items-start gap-3">
            <Phone size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                Telefonnummer
              </p>
              <p className="text-sm text-stone-800 mt-1">
                {facility.phone}
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        {facility.email && (
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                E-Mailadresse
              </p>
              <p className="text-sm text-stone-800 mt-1 break-all">
                {facility.email}
              </p>
            </div>
          </div>
        )}

        {/* Öffnungszeiten */}
        {facility.opening && (
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                Öffnungszeiten
              </p>
              <p className="text-sm text-stone-800 mt-1">
                {facility.opening}
              </p>
            </div>
          </div>
        )}

        {/* Hinweistext */}
        {facility.infoText && (
          <div className="flex items-start gap-3">
            <Info size={20} className="text-stone-500 mt-1" />
            <div>
              <p className="text-xs uppercase text-stone-500 font-semibold">
                Hinweise
              </p>
              <p className="text-sm text-stone-800 mt-1 whitespace-pre-wrap">
                {facility.infoText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}