// src/lib/storage.js
import {
  DEFAULT_PARENT_CODE,
  DEFAULT_TEAM_CODE,
  DEFAULT_ADMIN_CODE,
  GROUPS,
} from "./constants";

const PREFIX = "montessori_kita";

const key = (name) => `${PREFIX}_${name}`;

const safeGet = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Storage get error", e);
    return fallback;
  }
};

const safeSet = (k, value) => {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch (e) {
    console.error("Storage set error", e);
  }
};

export const StorageService = {
  get(collection) {
    return safeGet(key(collection), []);
  },

  set(collection, data) {
    safeSet(key(collection), data);
  },

  add(collection, item) {
    const items = this.get(collection);
    const newItem = {
      id:
        item.id ||
        Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...item,
    };
    items.push(newItem);
    this.set(collection, items);
    return newItem;
  },

  delete(collection, id) {
    const items = this.get(collection);
    this.set(
      collection,
      items.filter((i) => i.id !== id)
    );
  },

  update(collection, updatedItem) {
    const items = this.get(collection);
    const idx = items.findIndex((i) => i.id === updatedItem.id);
    if (idx >= 0) {
      items[idx] = updatedItem;
      this.set(collection, items);
    }
  },

  // ---- News / spätere Features ----
  // (bewusst generisch gelassen; News selbst liegen in "news")

  // ---- Abwesenheiten ----
  getAbsences() {
    return this.get("absences");
  },
  saveAbsences(list) {
    this.set("absences", list);
  },

  // ---- Speiseplan ----
  getMealPlan() {
    return this.get("mealplan");
  },
  saveMealPlan(plan) {
    this.set("mealplan", plan);
  },

  // ---- Default-Gruppenbasis ----
  getDefaultGroups() {
    return GROUPS;
  },

  // ---- Einrichtungs-Einstellungen (Name, Codes, Gruppen etc.) ----
  getFacilitySettings() {
    const defaults = {
      name: "Montessori Kinderhaus",
      location: "",
      openingHours: "",
      codes: {
        parent: DEFAULT_PARENT_CODE,
        team: DEFAULT_TEAM_CODE,
        admin: DEFAULT_ADMIN_CODE,
      },
      groups: GROUPS,
    };

    const current = safeGet(key("facility_settings"), null);
    if (!current) return defaults;

    return {
      ...defaults,
      ...current,
      codes: {
        ...defaults.codes,
        ...(current.codes || {}),
      },
      groups: current.groups && current.groups.length > 0
        ? current.groups
        : defaults.groups,
    };
  },

  saveFacilitySettings(settings) {
    const current = this.getFacilitySettings();
    const merged = {
      ...current,
      ...settings,
      codes: {
        ...current.codes,
        ...(settings.codes || {}),
      },
      groups: settings.groups && settings.groups.length > 0
        ? settings.groups
        : current.groups,
    };
    safeSet(key("facility_settings"), merged);
  },

  // ---- Komplettes Reset ----
  resetSystem() {
    if (
      confirm(
        "ACHTUNG: Alle Benutzer, Listen, Meldungen und Einstellungen werden gelöscht. Fortfahren?"
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  },
};