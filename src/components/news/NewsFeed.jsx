// src/components/news/NewsFeed.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Trash2, Heart, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { getGroupStyles } from "../../utils/groupUtils";

export default function NewsFeed({ user, news, groups, onDelete }) {
  const safeNews = Array.isArray(news) ? news : [];
  const safeGroups = Array.isArray(groups) ? groups : [];
  const [likes, setLikes] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  // Likes für alle News laden
  const loadLikes = useCallback(async () => {
    if (safeNews.length === 0) return;

    try {
      const newsIds = safeNews.map((n) => n.id);
      const { data, error } = await supabase
        .from("news_likes")
        .select("news_id, user_id")
        .in("news_id", newsIds);

      if (error) throw error;

      // Likes pro News gruppieren
      const likesMap = {};
      (data || []).forEach((like) => {
        if (!likesMap[like.news_id]) {
          likesMap[like.news_id] = [];
        }
        likesMap[like.news_id].push(like.user_id);
      });
      setLikes(likesMap);
    } catch (err) {
      console.error("Likes laden fehlgeschlagen:", err);
    }
  }, [safeNews]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  // Like togglen
  const toggleLike = async (newsId) => {
    const currentLikes = likes[newsId] || [];
    const hasLiked = currentLikes.includes(user.id);

    try {
      if (hasLiked) {
        await supabase
          .from("news_likes")
          .delete()
          .eq("news_id", newsId)
          .eq("user_id", user.id);

        setLikes((prev) => ({
          ...prev,
          [newsId]: currentLikes.filter((id) => id !== user.id),
        }));
      } else {
        await supabase.from("news_likes").insert({
          news_id: newsId,
          user_id: user.id,
        });

        setLikes((prev) => ({
          ...prev,
          [newsId]: [...currentLikes, user.id],
        }));
      }
    } catch (err) {
      console.error("Like fehlgeschlagen:", err);
    }
  };

  // Post erweitern/kollabieren
  const toggleExpand = (newsId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [newsId]: !prev[newsId],
    }));
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Heute, ${time}`;
    }
    if (isYesterday) {
      return `Gestern, ${time}`;
    }

    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + `, ${time}`;
  };

  // HTML-Text zu Plaintext für Vorschau
  const htmlToPlainText = (html) => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  // Text kürzen für Vorschau
  const shouldTruncate = (text) => {
    const plainText = text?.startsWith("<") ? htmlToPlainText(text) : text;
    return plainText && plainText.length > 200;
  };

  const renderContent = (text, isExpanded, newsId) => {
    if (!text) return null;
    const trimmed = text.trim();
    const needsTruncation = shouldTruncate(trimmed);

    if (trimmed.startsWith("<")) {
      // HTML Content
      const displayHtml = !isExpanded && needsTruncation
        ? htmlToPlainText(trimmed).substring(0, 200) + "..."
        : trimmed;

      return (
        <div className="space-y-2">
          {!isExpanded && needsTruncation ? (
            <p className="text-sm text-stone-700 leading-relaxed">
              {displayHtml}
            </p>
          ) : (
            <div
              className="prose prose-sm max-w-none text-stone-700 leading-relaxed prose-p:my-1 prose-headings:my-2"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          )}
          {needsTruncation && (
            <button
              onClick={() => toggleExpand(newsId)}
              className="text-amber-600 text-sm font-medium flex items-center gap-1 hover:text-amber-700"
            >
              {isExpanded ? (
                <>
                  Weniger anzeigen <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Weiterlesen <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      );
    }

    // Plain text
    const displayText = !isExpanded && needsTruncation
      ? trimmed.substring(0, 200) + "..."
      : trimmed;

    return (
      <div className="space-y-2">
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
        {needsTruncation && (
          <button
            onClick={() => toggleExpand(newsId)}
            className="text-amber-600 text-sm font-medium flex items-center gap-1 hover:text-amber-700"
          >
            {isExpanded ? (
              <>
                Weniger anzeigen <ChevronUp size={14} />
              </>
            ) : (
              <>
                Weiterlesen <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // Bildergalerie rendern
  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;

    // Bilder und andere Dateien trennen
    const images = attachments.filter((att) =>
      att.type?.startsWith("image/") ||
      att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    const otherFiles = attachments.filter(
      (att) => !images.includes(att)
    );

    return (
      <div className="space-y-3">
        {/* Bildergalerie als Grid */}
        {images.length > 0 && (
          <div
            className={`grid gap-2 ${
              images.length === 1
                ? "grid-cols-1"
                : images.length === 2
                ? "grid-cols-2"
                : images.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-xl cursor-pointer ${
                  images.length === 1 ? "max-h-80" : "aspect-square"
                }`}
                onClick={() => setLightboxImage(img.url)}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {images.length > 4 && idx === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      +{images.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Andere Dateien als Links */}
        {otherFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherFiles.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                download={att.name}
                className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg text-sm text-stone-700 hover:bg-stone-200 transition-colors"
              >
                <span className="text-lg">📎</span>
                <span className="truncate max-w-[150px]">{att.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!safeNews.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar size={24} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm">Keine Beiträge vorhanden.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {safeNews.map((n) => {
          // Multi-Gruppen Unterstützung
          const newsGroupIds =
            n.groupIds && n.groupIds.length > 0
              ? n.groupIds
              : n.groupId
              ? [n.groupId]
              : [];
          const newsGroups = newsGroupIds
            .map((gid) => safeGroups.find((g) => g.id === gid))
            .filter(Boolean);
          const isGlobal = newsGroupIds.length === 0;

          const postLikes = likes[n.id] || [];
          const hasLiked = postLikes.includes(user.id);
          const isExpanded = expandedPosts[n.id];

          return (
            <div
              key={n.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              {/* Header mit Gruppen-Chips und Datum */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {isGlobal ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                      Alle Gruppen
                    </span>
                  ) : (
                    newsGroups.map((group) => {
                      const styles = getGroupStyles(group);
                      return (
                        <span
                          key={group.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.chipClass}`}
                        >
                          <styles.Icon size={12} />
                          <span>{styles.name}</span>
                        </span>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <Calendar size={12} />
                  <span>{formatDate(n.date)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 pb-3 space-y-3">
                {/* Titel */}
                {n.title && (
                  <h3 className="text-lg font-bold text-stone-900 leading-tight">
                    {n.title}
                  </h3>
                )}

                {/* Text */}
                {renderContent(n.text, isExpanded, n.id)}

                {/* Attachments/Bilder */}
                {renderAttachments(n.attachments)}
              </div>

              {/* Footer mit Like und Delete */}
              <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between">
                {/* Like Button */}
                <button
                  onClick={() => toggleLike(n.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                    hasLiked
                      ? "bg-red-50 text-red-500"
                      : "bg-stone-50 text-stone-500 hover:bg-stone-100"
                  }`}
                >
                  <Heart
                    size={16}
                    fill={hasLiked ? "currentColor" : "none"}
                  />
                  <span className="text-sm font-medium">
                    {postLikes.length > 0 ? postLikes.length : "Gefällt mir"}
                  </span>
                </button>

                {/* Delete Button (nur Team/Admin) */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(n.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox für Bilder */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Vollbild"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
