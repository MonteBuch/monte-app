// src/components/chat/ChatRoom.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  Heart,
  Reply,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupStyles } from "../../utils/groupUtils";
import { useToast } from "../ui/Toast";

export default function ChatRoom({ group, user, participation, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [userNames, setUserNames] = useState({});
  const [likes, setLikes] = useState({});
  const messagesEndRef = useRef(null);
  const { showError } = useToast();

  const styles = getGroupStyles(group);

  // Nachrichten laden
  const loadMessages = useCallback(async () => {
    if (!participation?.activated_at) return;

    try {
      const { data, error } = await supabase
        .from("group_chat_messages")
        .select(`
          *,
          profiles!group_chat_messages_user_id_fkey (
            id,
            full_name
          )
        `)
        .eq("group_id", group.id)
        .gte("created_at", participation.activated_at)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // User-Namen extrahieren
      const names = {};
      (data || []).forEach((m) => {
        if (m.profiles) {
          names[m.user_id] = m.profiles.full_name || "Unbekannt";
        }
      });
      setUserNames(names);

      // Likes laden
      const messageIds = (data || []).map((m) => m.id);
      if (messageIds.length > 0) {
        const { data: likesData } = await supabase
          .from("group_chat_likes")
          .select("*")
          .in("message_id", messageIds);

        const likesMap = {};
        (likesData || []).forEach((like) => {
          if (!likesMap[like.message_id]) {
            likesMap[like.message_id] = [];
          }
          likesMap[like.message_id].push(like.user_id);
        });
        setLikes(likesMap);
      }

      // Last read aktualisieren
      await supabase
        .from("group_chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("id", participation.id);

    } catch (err) {
      console.error("Nachrichten laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [group.id, participation]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
          filter: `group_id=eq.${group.id}`,
        },
        async (payload) => {
          // Neue Nachricht mit Profil laden
          const { data } = await supabase
            .from("group_chat_messages")
            .select(`
              *,
              profiles!group_chat_messages_user_id_fkey (
                id,
                full_name
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
            if (data.profiles) {
              setUserNames((prev) => ({
                ...prev,
                [data.user_id]: data.profiles.full_name || "Unbekannt",
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id]);

  // Auto-scroll bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Nachricht senden
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("group_chat_messages").insert({
        facility_id: FACILITY_ID,
        group_id: group.id,
        user_id: user.id,
        content: newMessage.trim(),
        reply_to_id: replyTo?.id || null,
      });

      if (error) throw error;

      setNewMessage("");
      setReplyTo(null);
    } catch (err) {
      console.error("Nachricht senden fehlgeschlagen:", err);
      showError("Nachricht konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  };

  // Like togglen
  const toggleLike = async (messageId) => {
    const currentLikes = likes[messageId] || [];
    const hasLiked = currentLikes.includes(user.id);

    try {
      if (hasLiked) {
        await supabase
          .from("group_chat_likes")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);

        setLikes((prev) => ({
          ...prev,
          [messageId]: currentLikes.filter((id) => id !== user.id),
        }));
      } else {
        await supabase.from("group_chat_likes").insert({
          message_id: messageId,
          user_id: user.id,
        });

        setLikes((prev) => ({
          ...prev,
          [messageId]: [...currentLikes, user.id],
        }));
      }
    } catch (err) {
      console.error("Like fehlgeschlagen:", err);
    }
  };

  // Zeit formatieren
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Gestern, ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    }

    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Reply-Nachricht finden
  const getReplyMessage = (replyToId) => {
    return messages.find((m) => m.id === replyToId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-stone-200">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className={`p-2 rounded-xl ${styles.chipClass}`}>
          <styles.Icon size={18} />
        </div>
        <div>
          <h2 className="font-bold text-stone-800">{styles.name}</h2>
          <p className="text-xs text-stone-500">Gruppenchat</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-400 text-sm">
              Noch keine Nachrichten. Starte die Unterhaltung!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user_id === user.id;
            const messageLikes = likes[message.id] || [];
            const hasLiked = messageLikes.includes(user.id);
            const replyMessage = message.reply_to_id
              ? getReplyMessage(message.reply_to_id)
              : null;

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${isOwn ? "order-1" : ""}`}>
                  {/* Absender-Name (nur bei fremden Nachrichten) */}
                  {!isOwn && (
                    <p className="text-xs font-semibold text-stone-600 mb-1 px-1">
                      {userNames[message.user_id] || "Unbekannt"}
                    </p>
                  )}

                  {/* Reply-Preview */}
                  {replyMessage && (
                    <div
                      className={`text-xs px-3 py-1.5 mb-1 rounded-t-xl border-l-2 ${
                        isOwn
                          ? "bg-amber-100 border-amber-400 text-amber-800"
                          : "bg-stone-100 border-stone-400 text-stone-600"
                      }`}
                    >
                      <p className="font-semibold text-[10px]">
                        {userNames[replyMessage.user_id] || "Unbekannt"}
                      </p>
                      <p className="truncate">{replyMessage.content}</p>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? "bg-amber-500 text-white rounded-br-sm"
                        : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>

                  {/* Footer: Zeit + Aktionen */}
                  <div
                    className={`flex items-center gap-2 mt-1 px-1 ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px] text-stone-400">
                      {formatTime(message.created_at)}
                    </span>

                    {/* Like Button */}
                    <button
                      onClick={() => toggleLike(message.id)}
                      className={`flex items-center gap-1 text-[10px] ${
                        hasLiked ? "text-red-500" : "text-stone-400 hover:text-red-500"
                      }`}
                    >
                      <Heart
                        size={12}
                        fill={hasLiked ? "currentColor" : "none"}
                      />
                      {messageLikes.length > 0 && messageLikes.length}
                    </button>

                    {/* Reply Button (nur für fremde Nachrichten) */}
                    {!isOwn && (
                      <button
                        onClick={() => setReplyTo(message)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <Reply size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-stone-100 border-t border-stone-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-600">
              Antwort auf {userNames[replyTo.user_id] || "Unbekannt"}
            </p>
            <p className="text-xs text-stone-500 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 rounded hover:bg-stone-200"
          >
            <X size={16} className="text-stone-500" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="pt-4 border-t border-stone-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Nachricht schreiben..."
              rows={1}
              className="w-full px-4 py-3 text-sm resize-none focus:outline-none"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 rounded-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
