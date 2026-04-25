import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  User,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WhatsAppTemplate, WhatsAppLog, WhatsAppLogStatus } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReservationOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  client_code: string;
  client_token: string;
}

type TabKey = 'nouvel-envoi' | 'historique';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS: { key: TabKey; label: string }[] = [
  { key: 'nouvel-envoi', label: 'Nouvel envoi' },
  { key: 'historique', label: 'Historique' },
];

const STATUS_BADGE: Record<WhatsAppLogStatus, { label: string; cls: string }> = {
  sent: {
    label: 'Envoyé',
    cls: 'bg-green-900/40 text-green-300 border border-green-700/50',
  },
  pending: {
    label: 'En attente',
    cls: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
  },
  error: {
    label: 'Erreur',
    cls: 'bg-red-900/40 text-red-300 border border-red-700/50',
  },
  retry: {
    label: 'Nouvel essai',
    cls: 'bg-orange-900/40 text-orange-300 border border-orange-700/50',
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function replaceVariables(
  content: string,
  vars: Record<string, string>
): string {
  return content.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildWaMeLink(phone: string, content: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `https://wa.me/${cleaned.replace(/^0/, '').replace(/^\+/, '')}?text=${encodeURIComponent(content)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminWhatsApp() {
  /* ---- Tabs ---- */
  const [activeTab, setActiveTab] = useState<TabKey>('nouvel-envoi');

  /* ---- Templates ---- */
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  /* ---- Reservations ---- */
  const [reservations, setReservations] = useState<ReservationOption[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [manualPhone, setManualPhone] = useState('');

  /* ---- Message content ---- */
  const [messageContent, setMessageContent] = useState('');

  /* ---- Sending ---- */
  const [sending, setSending] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);

  /* ---- History ---- */
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  /* ---- Derived ---- */

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedReservation = reservations.find(
    (r) => r.id === selectedReservationId
  );

  const resolvedContent = (() => {
    let base = messageContent;
    if (selectedReservation) {
      const baseUrl = window.location.origin;
      const vars: Record<string, string> = {
        prenom: selectedReservation.first_name,
        lien: selectedReservation.client_token
          ? `${baseUrl}/client/${selectedReservation.client_token}`
          : '',
        code: selectedReservation.client_code,
      };
      base = replaceVariables(base, vars);
    }
    return base;
  })();

  const activePhone = selectedReservation
    ? selectedReservation.phone
    : manualPhone;

  /* ---- Fetch templates ---- */

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates((data as WhatsAppTemplate[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des modèles:', err);
    }
  }, []);

  /* ---- Fetch reservations ---- */

  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(
          'id, first_name, last_name, phone, email, client_code, client_token'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations((data as ReservationOption[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des réservations:', err);
    }
  }, []);

  /* ---- Fetch logs ---- */

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select(
          '*, reservations(first_name, last_name), clients(first_name, last_name), whatsapp_templates(name)'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data as WhatsAppLog[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  /* ---- Initial load ---- */

  useEffect(() => {
    fetchTemplates();
    fetchReservations();
    fetchLogs();
  }, [fetchTemplates, fetchReservations, fetchLogs]);

  /* ---- When template changes, populate content ---- */

  useEffect(() => {
    if (selectedTemplate) {
      setMessageContent(selectedTemplate.content);
      setWaLink(null);
    }
  }, [selectedTemplate]);

  /* ---- When reservation changes, clear wa link ---- */

  useEffect(() => {
    setWaLink(null);
  }, [selectedReservationId, manualPhone]);

  /* ---- Send handler ---- */

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activePhone.trim() || !messageContent.trim()) return;

    setSending(true);
    try {
      const waMeLink = buildWaMeLink(activePhone, resolvedContent);

      const { data, error } = await supabase
        .from('whatsapp_logs')
        .insert({
          reservation_id: selectedReservationId || null,
          client_id: null,
          template_id: selectedTemplateId || null,
          phone: activePhone,
          content: resolvedContent,
          status: 'pending',
          wa_me_link: waMeLink,
          error_message: '',
        })
        .select('id')
        .single();

      if (error) throw error;

      /* Update status to sent since we'll open the link */
      if (data?.id) {
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'sent' })
          .eq('id', data.id);
      }

      setWaLink(waMeLink);
      fetchLogs();
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
    } finally {
      setSending(false);
    }
  }

  /* ---- Retry handler ---- */

  async function handleRetry(log: WhatsAppLog) {
    try {
      const waMeLink = buildWaMeLink(log.phone, log.content);
      await supabase
        .from('whatsapp_logs')
        .update({ status: 'retry', wa_me_link: waMeLink })
        .eq('id', log.id);

      fetchLogs();
      window.open(waMeLink, '_blank');
    } catch (err) {
      console.error('Erreur lors du nouvel essai:', err);
    }
  }

  /* ---- Render: Nouvel envoi ---- */

  function renderNouvelEnvoi() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Template selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Modèle WhatsApp
            </label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setWaLink(null);
                }}
                className="w-full pl-4 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
              >
                <option value="">-- Sélectionner un modèle --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Destinataire */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Destinataire
            </label>
            <div className="space-y-3">
              {/* Reservation selector */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <select
                  value={selectedReservationId}
                  onChange={(e) => {
                    setSelectedReservationId(e.target.value);
                    setManualPhone('');
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                >
                  <option value="">-- Sélectionner une réservation --</option>
                  {reservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.first_name} {r.last_name}
                      {r.phone ? ` - ${r.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs uppercase">ou</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* Manual phone */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  placeholder="Numéro manuel (ex: +33612345678)"
                  value={manualPhone}
                  onChange={(e) => {
                    setManualPhone(e.target.value);
                    setSelectedReservationId('');
                  }}
                  disabled={!!selectedReservationId}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Message content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Contenu du message
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value);
                setWaLink(null);
              }}
              rows={8}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
              placeholder="Rédigez votre message..."
            />
            <p className="text-gray-500 text-xs mt-1.5">
              Variables disponibles :{' '}
              <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">
                {'{prenom}'}
              </code>
              ,{' '}
              <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">
                {'{lien}'}
              </code>
              ,{' '}
              <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">
                {'{code}'}
              </code>
            </p>
          </div>

          {/* Send button */}
          <form onSubmit={handleSend}>
            <button
              type="submit"
              disabled={
                sending ||
                !activePhone.trim() ||
                !messageContent.trim()
              }
              className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-3 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Envoyer
            </button>
          </form>

          {/* Open in WhatsApp link */}
          {waLink && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm flex-1">
                Message enregistré. Ouvrez WhatsApp pour l'envoyer.
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-500 transition-colors text-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir dans WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Right: WhatsApp preview */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Aperçu
          </label>
          <div
            className="rounded-2xl p-4 flex-1 min-h-[300px] flex flex-col"
            style={{ backgroundColor: '#25D366' }}
          >
            {/* Simulated message bubble */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="bg-white/95 rounded-xl rounded-tr-sm px-4 py-3 max-w-full shadow-sm">
                <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                  {resolvedContent || (
                    <span className="text-gray-400 italic">
                      Le message apparaîtra ici...
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1.5">
                  <span className="text-gray-400 text-[10px]">
                    {new Date().toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <svg
                    viewBox="0 0 16 11"
                    className="w-4 h-3 text-blue-500"
                    fill="currentColor"
                  >
                    <path d="M11.07 0.83L11.07 0.83C11.26 0.64 11.57 0.64 11.76 0.83L14.17 3.24C14.36 3.43 14.36 3.74 14.17 3.93L6.38 11.72L3.97 9.31L11.07 0.83Z" />
                    <path d="M5.59 11.72L0.83 6.97C0.64 6.78 0.64 6.47 0.83 6.28L3.24 3.87C3.43 3.68 3.74 3.68 3.93 3.87L8.69 8.62L5.59 11.72Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Variable resolution hint */}
          {selectedReservation && messageContent.includes('{') && (
            <div className="mt-3 bg-gray-900 border border-amber-900/20 rounded-xl p-3">
              <p className="text-gray-400 text-xs font-medium mb-1.5">
                Variables résolues :
              </p>
              <div className="space-y-1">
                {messageContent.includes('{prenom}') && (
                  <p className="text-xs">
                    <code className="text-amber-400/80">{'{prenom}'}</code>
                    <span className="text-gray-600 mx-1.5">&rarr;</span>
                    <span className="text-white">
                      {selectedReservation.first_name}
                    </span>
                  </p>
                )}
                {messageContent.includes('{lien}') && (
                  <p className="text-xs">
                    <code className="text-amber-400/80">{'{lien}'}</code>
                    <span className="text-gray-600 mx-1.5">&rarr;</span>
                    <span className="text-white truncate inline-block max-w-[260px] align-bottom">
                      {selectedReservation.client_token
                        ? `${window.location.origin}/client/${selectedReservation.client_token}`
                        : 'Non disponible'}
                    </span>
                  </p>
                )}
                {messageContent.includes('{code}') && (
                  <p className="text-xs">
                    <code className="text-amber-400/80">{'{code}'}</code>
                    <span className="text-gray-600 mx-1.5">&rarr;</span>
                    <span className="text-white">
                      {selectedReservation.client_code || 'Non disponible'}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---- Render: Historique ---- */

  function renderHistorique() {
    if (loadingLogs) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div className="px-6 py-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Aucun envoi enregistré</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Destinataire
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Téléphone
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Modèle
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.pending;

                const recipientName =
                  (log.reservations as any)?.first_name ||
                  (log.clients as any)?.first_name ||
                  null;
                const recipientLastName =
                  (log.reservations as any)?.last_name ||
                  (log.clients as any)?.last_name ||
                  null;
                const displayName = recipientName
                  ? `${recipientName} ${recipientLastName ?? ''}`.trim()
                  : '---';

                const templateName =
                  (log.whatsapp_templates as any)?.name ?? '---';

                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">
                      {displayName}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {log.phone || '---'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {templateName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {log.wa_me_link && (
                          <a
                            href={log.wa_me_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-green-400 transition-colors hover:bg-green-500/20"
                            title="Ouvrir dans WhatsApp"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {(log.status === 'error' || log.status === 'retry') && (
                          <button
                            onClick={() => handleRetry(log)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                            title="Renvoyer"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">WhatsApp Envois</h1>
        <p className="text-gray-400 text-sm mt-1">
          Envoyez des messages WhatsApp à vos clients
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-amber-500 text-gray-950'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'nouvel-envoi' && renderNouvelEnvoi()}
      {activeTab === 'historique' && renderHistorique()}
    </div>
  );
}
