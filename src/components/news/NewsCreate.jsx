// src/components/news/NewsCreate.jsx

import React, { useState } from "react";
import {
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Trash2,
  List as ListIcon,
  ListOrdered,
  Minus as MinusIcon,
  Type as TypeIcon,
  Check,
  Images,
  X,
} from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark } from "@tiptap/core";

import { getGroupStyles } from "../../utils/groupUtils";

// Bildkomprimierung: Max 1920px Breite, 85% Qualität
const MAX_IMAGE_WIDTH = 1920;
const IMAGE_QUALITY = 0.85;

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      // Berechne neue Dimensionen
      let width = img.width;
      let height = img.height;

      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round((height * MAX_IMAGE_WIDTH) / width);
        width = MAX_IMAGE_WIDTH;
      }

      // Canvas erstellen und Bild zeichnen
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Versuche WebP, Fallback zu JPEG
      let result = canvas.toDataURL("image/webp", IMAGE_QUALITY);
      if (!result.startsWith("data:image/webp")) {
        // Browser unterstützt kein WebP, nutze JPEG
        result = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
      }

      // Logging für Debug
      const originalSize = (file.size / 1024).toFixed(1);
      const compressedSize = (result.length * 0.75 / 1024).toFixed(1); // Base64 ist ~33% größer
      console.log(`Bild komprimiert: ${originalSize}KB → ${compressedSize}KB (${img.width}x${img.height} → ${width}x${height})`);

      resolve(result);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Custom Underline Mark
const CustomUnderline = Mark.create({
  name: "customUnderline",

  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration", consuming: false }];
  },

  renderHTML() {
    return ["u", {}, 0];
  },

  addCommands() {
    return {
      toggleCustomUnderline:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});

export default function NewsCreate({
  user,
  groups,
  selectedGroupIds,
  onGroupsChange,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]); // Neue Bildergalerie
  const [refresh, setRefresh] = useState(0);

  // Effektive Auswahl: Array von IDs oder "all"
  const isAllSelected = selectedGroupIds.length === 0;
  const displayGroups = groups.filter((g) => !g.is_event_group);

  // Ersten ausgewählten Gruppe für Header-Styling
  const firstSelectedGroup = !isAllSelected
    ? groups.find((g) => selectedGroupIds.includes(g.id))
    : null;

  const styles = getGroupStyles(firstSelectedGroup);
  const iconBg = firstSelectedGroup
    ? styles.chipClass
    : "bg-stone-200 text-stone-700";

  // Label für Button
  const getTargetLabel = () => {
    if (isAllSelected) return "Alle";
    if (selectedGroupIds.length === 1) {
      const group = groups.find((g) => g.id === selectedGroupIds[0]);
      return group?.name || "Gruppe";
    }
    return `${selectedGroupIds.length} Gruppen`;
  };

  // Gruppe toggle (Multi-Select)
  const toggleGroup = (groupId) => {
    if (selectedGroupIds.includes(groupId)) {
      // Entfernen
      onGroupsChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      // Hinzufügen
      onGroupsChange([...selectedGroupIds, groupId]);
    }
  };

  // "Alle" auswählen (leeres Array = alle)
  const selectAll = () => {
    onGroupsChange([]);
  };

  // TIPTAP EDITOR (ohne inline Images - Bilder gehen in Galerie)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        link: {
          autolink: true,
          openOnClick: true,
        },
      }),
      CustomUnderline,
      Placeholder.configure({
        placeholder: "Nachricht eingeben...",
      }),
    ],
    content: "",
    onUpdate() {
      setRefresh((x) => x + 1);
    },
    onSelectionUpdate() {
      setRefresh((x) => x + 1);
    },
  });

  // FORMAT COMMANDS
  const applyFormat = (command) => {
    if (!editor) return;

    const chain = editor.chain().focus();

    switch (command) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "underline":
        chain.toggleCustomUnderline().run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "heading":
        if (editor.isActive("heading", { level: 2 })) {
          chain.setParagraph().run();
        } else {
          chain.setHeading({ level: 2 }).run();
        }
        break;
      case "hr":
        chain.setHorizontalRule().run();
        break;
      default:
        return;
    }
    setRefresh((x) => x + 1);
  };

  const isActive = (name, attrs = {}) =>
    editor ? editor.isActive(name, attrs) : false;

  // GALERIE-BILDER HINZUFÜGEN (mehrere möglich)
  const handleGalleryImagesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      try {
        // Komprimiere das Bild und erstelle Vorschau
        const compressedDataUrl = await compressImage(file);
        newImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          preview: compressedDataUrl,
        });
      } catch (error) {
        console.error("Fehler beim Verarbeiten des Bildes:", error);
      }
    }

    setGalleryImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  // Galerie-Bild entfernen
  const removeGalleryImage = (id) => {
    setGalleryImages((prev) => prev.filter((img) => img.id !== id));
  };

  // FILE ATTACHMENTS
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const mapped = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));

    setAttachments((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // SUBMIT
  const handleSubmit = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const plain = editor.getText().trim();
    // Erlauben wenn Text ODER Bilder vorhanden
    if (!plain && galleryImages.length === 0) return;

    // Galerie-Bilder + andere Attachments zusammenführen
    const allAttachments = [
      ...galleryImages.map((img) => ({
        name: img.name,
        size: img.size,
        type: img.type,
        file: img.file,
      })),
      ...attachments,
    ];

    const newItem = {
      id: crypto.randomUUID(),
      title: title.trim() || null,
      text: html,
      date: new Date().toISOString(),
      // Neue Struktur: groupIds Array (leer = alle)
      groupIds: isAllSelected ? [] : selectedGroupIds,
      // Legacy-Felder für Abwärtskompatibilität
      groupId: isAllSelected ? null : (selectedGroupIds[0] || null),
      target: isAllSelected ? "all" : "group",
      attachments: allAttachments,
      createdBy: user.id,
    };

    onSubmit(newItem);

    // Reset
    setTitle("");
    editor.commands.setContent("");
    setAttachments([]);
    setGalleryImages([]);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div
        className="p-5 rounded-3xl border shadow-sm text-stone-800 transition-colors duration-300"
        style={{ backgroundColor: styles.headerColor }}
      >
        <div className="flex items-center gap-3">
          <div className={`${iconBg} p-2 rounded-2xl shadow transition-colors duration-300`}>
            <styles.Icon size={18} />
          </div>

          <div>
            <h3 className="text-lg font-bold">News erstellen</h3>
            <p className="text-xs opacity-80">Neue Mitteilung an Eltern senden</p>
          </div>
        </div>

        {/* Gruppenwahl - Multi-Select */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-stone-600 mb-2">Empfänger auswählen:</p>
          <div className="flex flex-wrap gap-2">
            {/* "Alle" Button */}
            <button
              onClick={selectAll}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                isAllSelected
                  ? "bg-stone-800 text-white border-transparent"
                  : "bg-white/50 text-stone-600 border-stone-300 hover:bg-white"
              }`}
            >
              {isAllSelected && <Check size={12} />}
              Alle
            </button>

            {/* Gruppen-Buttons (Multi-Select) */}
            {displayGroups.map((g) => {
              const btnStyles = getGroupStyles(g);
              const isSelected = selectedGroupIds.includes(g.id);

              return (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                    isSelected
                      ? `${btnStyles.chipClass} border-transparent shadow-sm`
                      : "bg-white/50 text-stone-600 border-stone-300 hover:bg-white"
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TITEL INPUT */}
      <div className="rounded-2xl border border-stone-300 bg-white overflow-hidden shadow-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Betreff / Headline (optional)"
          className="w-full px-4 py-3 text-sm font-semibold border-b border-stone-200 focus:outline-none focus:bg-amber-50 transition-colors"
        />

        {/* Toolbar */}
        {editor && (
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-stone-50">
            <button onClick={() => applyFormat("bold")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("bold") ? "bg-stone-300" : ""}`}><Bold size={16} /></button>
            <button onClick={() => applyFormat("italic")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("italic") ? "bg-stone-300" : ""}`}><Italic size={16} /></button>
            <button onClick={() => applyFormat("underline")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("customUnderline") ? "bg-stone-300" : ""}`}><UnderlineIcon size={16} /></button>
            <span className="w-px h-5 bg-stone-300 mx-1" />
            <button onClick={() => applyFormat("bulletList")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("bulletList") ? "bg-stone-300" : ""}`}><ListIcon size={16} /></button>
            <button onClick={() => applyFormat("orderedList")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("orderedList") ? "bg-stone-300" : ""}`}><ListOrdered size={16} /></button>
            <button onClick={() => applyFormat("heading")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("heading", { level: 2 }) ? "bg-stone-300" : ""}`}><TypeIcon size={16} /></button>

            <button onClick={() => applyFormat("hr")} className="p-1.5 rounded-md hover:bg-stone-200">
              <MinusIcon size={16} />
            </button>

            <div className="flex-1" />

            {/* Bilder für Galerie */}
            <label className="p-1.5 rounded-md hover:bg-stone-200 cursor-pointer" title="Bilder hinzufügen">
              <Images size={16} />
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryImagesChange} />
            </label>

            {/* Andere Dateien */}
            <label className="p-1.5 rounded-md hover:bg-stone-200 cursor-pointer" title="Dateien anhängen">
              <Paperclip size={16} />
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {/* EDITOR AREA */}
        <EditorContent
          editor={editor}
          className="ProseMirror min-h-[140px] px-3 py-2 focus:outline-none text-sm"
        />
      </div>

      {/* BILDERGALERIE VORSCHAU */}
      {galleryImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-500 flex items-center gap-1">
            <Images size={14} />
            {galleryImages.length} {galleryImages.length === 1 ? "Bild" : "Bilder"}
          </p>
          <div className={`grid gap-2 ${
            galleryImages.length === 1 ? "grid-cols-1" :
            galleryImages.length === 2 ? "grid-cols-2" :
            "grid-cols-3"
          }`}>
            {galleryImages.map((img) => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200"
              >
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(img.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {/* Button zum Hinzufügen weiterer Bilder */}
            <label className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:bg-stone-50 hover:border-amber-400 transition-colors">
              <div className="text-center text-stone-400">
                <Images size={24} className="mx-auto mb-1" />
                <span className="text-xs">Weitere</span>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryImagesChange} />
            </label>
          </div>
        </div>
      )}

      {/* ATTACHMENTS */}
      {attachments.length > 0 && (
        <div className="space-y-1 text-xs">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-2"
            >
              <span className="truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SEND */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2 text-sm shadow-md transition-transform"
      >
        <Send size={18} />
        {`Mitteilung an ${getTargetLabel()} senden`}
      </button>
    </div>
  );
}
