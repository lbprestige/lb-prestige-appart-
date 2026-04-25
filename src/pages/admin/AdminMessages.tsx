import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Message } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Conversation {
  reservation_id: string;
  client_id: string;
  client_name: string;
  last_message: string;
  last_at: string;
  unread_count: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function groupByReservation(messages: Message[]): Conversation[] {
  const map = new Map<string, Conversation>();

  for (const msg of messages) {
    const key = msg.reservation_id;
    const existing = map.get(key);

    const clientName =
      msg.sender === 'client'
        ? `${(msg as any).first_name ?? ''} ${(msg as any).last_name ?? ''}`.trim() || 'Client'
        : existing?.client_name ?? 'Client';

    if (!existing || msg.created_at > existing.last_at) {
      map.set(key, {
        reservation_id: msg.reservation_id,
        client_id: msg.client_id,
        client_name: clientName,
        last_message: msg.content,
        last_at: msg.created_at,
        unread_count: existing?.unread_count ?? 0,
      });
    } else if (existing) {
      map.set(key, { ...existing, client_name: clientName });
    }

    if (msg.sender === 'client' && !msg.read_at) {
      const conv = map.get(key)!;
      map.set(key, { ...conv, unread_count: conv.unread_count + 1 });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ---- Derived ---- */

  const conversations = groupByReservation(messages);

  const selectedMessages = selectedResId
    ? messages
        .filter((m) => m.reservation_id === selectedResId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const selectedConversation = conversations.find(
    (c) => c.reservation_id === selectedResId
  );

  /* ---- Fetch ---- */

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, reservations(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data as Message[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /* ---- Scroll to bottom on selection change or new messages ---- */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedResId, selectedMessages.length]);

  /* ---- Mark as read ---- */

  const markAsRead = useCallback(
    async (reservationId: string) => {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('reservation_id', reservationId)
          .eq('sender', 'client')
          .is('read_at', null);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((m) =>
            m.reservation_id === reservationId && m.sender === 'client' && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      } catch (err) {
        console.error('Erreur lors du marquage des messages:', err);
      }
    },
    []
  );

  /* ---- Select conversation ---- */

  function selectConversation(resId: string) {
    setSelectedResId(resId);
    markAsRead(resId);
  }

  /* ---- Send message ---- */

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !selectedResId || !selectedConversation) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          reservation_id: selectedResId,
          client_id: selectedConversation.client_id,
          sender: 'admin',
          content,
          read_at: new Date().toISOString(),
        })
        .select('*, reservations(first_name, last_name)')
        .single();

      if (error) throw error;

      setMessages((prev) => [data as Message, ...prev]);
      setMessageInput('');
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
    } finally {
      setSending(false);
    }
  }

  /* ---- Mobile back ---- */

  function goBackToList() {
    setSelectedResId(null);
  }

  /* ---- Render helpers ---- */

  function renderConversationList() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="px-6 py-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Aucune conversation</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-800">
        {conversations.map((conv) => {
          const isSelected = conv.reservation_id === selectedResId;
          return (
            <button
              key={conv.reservation_id}
              onClick={() => selectConversation(conv.reservation_id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                isSelected
                  ? 'bg-gray-800/80'
                  : 'hover:bg-gray-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-white text-sm font-medium truncate">
                  {conv.client_name}
                </span>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatTime(conv.last_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-gray-400 text-sm truncate">{conv.last_message}</span>
                {conv.unread_count > 0 && (
                  <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-gray-950 text-xs font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderChatPanel() {
    if (!selectedResId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <MessageSquare className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Messages</p>
          <p className="text-gray-600 text-sm mt-1">
            Sélectionnez une conversation pour commencer
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/80">
          <button
            onClick={goBackToList}
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white text-sm font-semibold">
              {selectedConversation?.client_name ?? 'Client'}
            </h2>
            <p className="text-gray-500 text-xs">
              Réservation {selectedResId.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {selectedMessages.map((msg) => {
            const isClient = msg.sender === 'client';
            return (
              <div
                key={msg.id}
                className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isClient
                      ? 'bg-gray-800 text-gray-100 rounded-bl-md'
                      : 'bg-amber-500/90 text-gray-950 rounded-br-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 ${
                      isClient ? 'text-gray-500' : 'text-gray-800'
                    }`}
                  >
                    <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                    {!isClient &&
                      (msg.read_at ? (
                        <CheckCheck className="w-3.5 h-3.5 text-gray-700" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-700" />
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Date separator for context */}
        {selectedMessages.length > 0 && (
          <div className="px-4 pb-1">
            <p className="text-gray-600 text-[10px] text-center">
              {formatDateShort(selectedMessages[0].created_at)}
            </p>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-950/80"
        >
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || sending}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gérez les conversations avec vos clients
        </p>
      </div>

      {/* Chat layout */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden flex h-[calc(100vh-220px)] min-h-[420px]">
        {/* Left panel - conversation list */}
        <div
          className={`w-full md:w-80 md:min-w-[320px] border-r border-gray-800 flex flex-col ${
            selectedResId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-white text-sm font-semibold">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">{renderConversationList()}</div>
        </div>

        {/* Right panel - chat */}
        <div
          className={`flex-1 flex flex-col ${
            selectedResId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {renderChatPanel()}
        </div>
      </div>
    </div>
  );
}
