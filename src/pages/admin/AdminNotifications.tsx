import { useState, useEffect, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  MessageSquare,
  CalendarPlus,
  Bell,
  Info,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  CheckCheck,
  Mail,
  MailOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Notification, NotificationType } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type ReadFilter = 'all' | 'unread' | 'read';

const READ_FILTER_OPTIONS: { value: ReadFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read', label: 'Lues' },
];

const TYPE_FILTER_OPTIONS: { value: '' | NotificationType; label: string }[] = [
  { value: '', label: 'Tous les types' },
  { value: 'arrivee', label: 'Arrivée' },
  { value: 'depart', label: 'Départ' },
  { value: 'message', label: 'Message' },
  { value: 'reservation', label: 'Réservation' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'info', label: 'Info' },
];

const typeConfig: Record<NotificationType, { icon: typeof LogIn; label: string; cls: string }> = {
  arrivee: { icon: LogIn, label: 'Arrivée', cls: 'bg-green-500/20 border-green-700/40 text-green-400' },
  depart: { icon: LogOut, label: 'Départ', cls: 'bg-blue-500/20 border-blue-700/40 text-blue-400' },
  message: { icon: MessageSquare, label: 'Message', cls: 'bg-amber-500/20 border-amber-700/40 text-amber-400' },
  reservation: { icon: CalendarPlus, label: 'Réservation', cls: 'bg-cyan-500/20 border-cyan-700/40 text-cyan-400' },
  rappel: { icon: Bell, label: 'Rappel', cls: 'bg-yellow-500/20 border-yellow-700/40 text-yellow-400' },
  info: { icon: Info, label: 'Info', cls: 'bg-gray-500/20 border-gray-600/40 text-gray-400' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminNotifications() {
  /* --- state --- */
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'' | NotificationType>('');

  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  /* --- fetch notifications --- */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as Notification[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* --- filtering --- */
  const filtered = notifications.filter((n) => {
    if (readFilter === 'unread' && n.read) return false;
    if (readFilter === 'read' && !n.read) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* --- mark as read --- */
  async function markAsRead(notification: Notification) {
    if (notification.read) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
    }
  }

  /* --- mark all as read --- */
  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erreur lors du marquage de toutes les notifications:', err);
    } finally {
      setMarkingAll(false);
    }
  }

  /* --- delete --- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchNotifications();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setDeleting(false);
    }
  }

  /* --- render --- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount !== 1 ? 's' : ''} non lue${unreadCount !== 1 ? 's' : ''}`
              : 'Toutes les notifications sont lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Read filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 shrink-0">Lire :</span>
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {READ_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReadFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  readFilter === opt.value
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-700/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
                {opt.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-amber-500 text-gray-950 font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter */}
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as '' | NotificationType)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-amber-900/20 rounded-xl px-6 py-16 text-center">
          <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucune notification trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const config = typeConfig[notification.type] ?? typeConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification)}
                className={`group bg-gray-900 border rounded-xl overflow-hidden transition-all cursor-pointer ${
                  notification.read
                    ? 'border-gray-800 opacity-70 hover:opacity-100'
                    : 'border-amber-900/30 hover:border-amber-700/40'
                }`}
              >
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Type icon */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${config.cls}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          notification.read ? 'text-gray-300' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatDateShort(notification.created_at)}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>

                    {notification.content && (
                      <p className={`text-sm mt-1 leading-relaxed ${
                        notification.read ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {notification.content}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-600">
                        {formatDate(notification.created_at)}
                      </span>
                      {notification.read ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <MailOpen className="w-3 h-3" />
                          Lu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400/70">
                          <Mail className="w-3 h-3" />
                          Non lu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(notification);
                    }}
                    className="shrink-0 inline-flex items-center justify-center rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Delete Confirmation Dialog ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Supprimer la notification</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer la notification{' '}
              <span className="text-white font-medium">
                {deleteTarget.title}
              </span>{' '}
              ?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
