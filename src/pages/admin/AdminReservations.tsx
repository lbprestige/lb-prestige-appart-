import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  ChevronDown,
  MessageCircle,
  Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Reservation, ReservationStatus, WhatsAppStatus } from '../../types/database';
import { CopyButton } from '../../components/ui/CopyButton';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SUITE_TYPES = ['Suite Premium', 'Suite Prestige', 'Appartement Complet'] as const;

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
];

const STATUS_FILTER_OPTIONS: { value: '' | ReservationStatus; label: string }[] = [
  { value: '', label: 'Tous' },
  ...STATUS_OPTIONS,
];

const statusBadge: Record<ReservationStatus, { label: string; cls: string }> = {
  planifiee: { label: 'Planifiée', cls: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
  en_cours: { label: 'En cours', cls: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  terminee: { label: 'Terminée', cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
  annulee: { label: 'Annulée', cls: 'bg-red-900/40 text-red-300 border border-red-700/50' },
};

const whatsappBadge: Record<WhatsAppStatus, { label: string; cls: string }> = {
  envoye: { label: 'Envoyé', cls: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  non_envoye: { label: 'Non envoyé', cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
  erreur: { label: 'Erreur', cls: 'bg-red-900/40 text-red-300 border border-red-700/50' },
};

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateClientCode(lastName: string): string {
  const prefix = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return prefix + digits;
}

function generateToken(): string {
  return crypto.randomUUID();
}

function cleanPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[\s\-().]/g, '').replace(/^\+/, '').replace(/^0/, '237');
}

function buildWhatsAppLink(phone: string, message: string): string {
  const clean = cleanPhoneForWhatsApp(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function buildConfirmationMessage(firstName: string, clientCode: string, clientToken: string): string {
  const link = `${window.location.origin}/client/${clientToken}?code=${clientCode}`;
  return `Bonjour ${firstName}, votre réservation est confirmée. Voici votre lien d'accès personnel : ${link}`;
}

/* ------------------------------------------------------------------ */
/*  Form data type                                                     */
/* ------------------------------------------------------------------ */

interface ReservationFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  check_in: string;
  check_out: string;
  suite_type: string;
  guests_count: number;
  status: ReservationStatus;
  internal_notes: string;
}

const EMPTY_FORM: ReservationFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  check_in: '',
  check_out: '',
  suite_type: SUITE_TYPES[0],
  guests_count: 1,
  status: 'planifiee',
  internal_notes: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ReservationStatus>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* WhatsApp send state */
  const [whatsappSending, setWhatsappSending] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReservations((data as Reservation[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des réservations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const filtered = reservations.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        r.first_name?.toLowerCase().includes(q) ||
        r.last_name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.client_code?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const visible = filtered.slice(0, visibleCount);

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(r: Reservation) {
    setEditingId(r.id);
    setForm({
      first_name: r.first_name ?? '',
      last_name: r.last_name ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
      check_in: r.check_in ?? '',
      check_out: r.check_out ?? '',
      suite_type: r.suite_type ?? SUITE_TYPES[0],
      guests_count: r.guests_count ?? 1,
      status: r.status ?? 'planifiee',
      internal_notes: r.internal_notes ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setField<K extends keyof ReservationFormData>(key: K, value: ReservationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* --- Send WhatsApp directly --- */
  async function sendWhatsApp(r: Reservation) {
    if (!r.phone) return;
    setWhatsappSending(r.id);
    try {
      const message = buildConfirmationMessage(r.first_name, r.client_code, r.client_token);
      const waLink = buildWhatsAppLink(r.phone, message);

      // Log the send
      await supabase.from('whatsapp_logs').insert({
        reservation_id: r.id,
        client_id: r.client_id,
        phone: r.phone,
        content: message,
        status: 'sent',
        wa_me_link: waLink,
      });

      // Update reservation whatsapp_status
      await supabase
        .from('reservations')
        .update({ whatsapp_status: 'envoye' })
        .eq('id', r.id);

      // Open WhatsApp
      window.open(waLink, '_blank');

      fetchReservations();
    } catch (err) {
      console.error('Erreur WhatsApp:', err);
    } finally {
      setWhatsappSending(null);
    }
  }

  /* --- Create + Confirm & Send WhatsApp --- */
  async function handleConfirmAndSend(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clientCode = generateClientCode(form.last_name);
      const clientToken = generateToken();

      let clientId: string | null = null;
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('email', form.email)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            email: form.email,
          })
          .select('id')
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient?.id ?? null;
      }

      const { data: resData, error } = await supabase
        .from('reservations')
        .insert({
          client_id: clientId,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          check_in: form.check_in,
          check_out: form.check_out,
          suite_type: form.suite_type,
          guests_count: form.guests_count,
          status: form.status,
          client_code: clientCode,
          client_token: clientToken,
          internal_notes: form.internal_notes,
          whatsapp_status: 'non_envoye',
        })
        .select()
        .single();

      if (error) throw error;

      closeModal();
      fetchReservations();

      // Auto-open WhatsApp if phone provided
      if (form.phone && resData) {
        const message = buildConfirmationMessage(form.first_name, clientCode, clientToken);
        const waLink = buildWhatsAppLink(form.phone, message);

        await supabase.from('whatsapp_logs').insert({
          reservation_id: resData.id,
          client_id: clientId,
          phone: form.phone,
          content: message,
          status: 'sent',
          wa_me_link: waLink,
        });

        await supabase
          .from('reservations')
          .update({ whatsapp_status: 'envoye' })
          .eq('id', resData.id);

        window.open(waLink, '_blank');
        fetchReservations();
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  /* --- Simple create/update (no WhatsApp) --- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('reservations')
          .update({
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            email: form.email,
            check_in: form.check_in,
            check_out: form.check_out,
            suite_type: form.suite_type,
            guests_count: form.guests_count,
            status: form.status,
            internal_notes: form.internal_notes,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const clientCode = generateClientCode(form.last_name);
        const clientToken = generateToken();

        let clientId: string | null = null;
        const { data: existingClients } = await supabase
          .from('clients')
          .select('id')
          .eq('email', form.email)
          .limit(1);

        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id;
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({
              first_name: form.first_name,
              last_name: form.last_name,
              phone: form.phone,
              email: form.email,
            })
            .select('id')
            .single();
          if (clientErr) throw clientErr;
          clientId = newClient?.id ?? null;
        }

        const { error } = await supabase.from('reservations').insert({
          client_id: clientId,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          check_in: form.check_in,
          check_out: form.check_out,
          suite_type: form.suite_type,
          guests_count: form.guests_count,
          status: form.status,
          client_code: clientCode,
          client_token: clientToken,
          internal_notes: form.internal_notes,
          whatsapp_status: 'non_envoye',
        });
        if (error) throw error;
      }

      closeModal();
      fetchReservations();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('reservations').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchReservations();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Réservations</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez toutes les réservations</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouvelle réservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, email, code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as '' | ReservationStatus); setVisibleCount(PAGE_SIZE); }}
            className="appearance-none pl-4 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Téléphone</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Période</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Code</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Lien</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">WhatsApp</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const sBadge = statusBadge[r.status] ?? statusBadge.planifiee;
                    const wBadge = whatsappBadge[r.whatsapp_status] ?? whatsappBadge.non_envoye;
                    const clientLink = r.client_token ? `/client/${r.client_token}` : null;

                    return (
                      <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white text-sm font-medium">{r.first_name} {r.last_name}</div>
                          <div className="text-gray-500 text-xs">{r.suite_type || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">{r.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-300 text-sm">{r.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                          {formatDate(r.check_in)} — {formatDate(r.check_out)}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm font-mono">{r.client_code || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${sBadge.cls}`}>
                            {sBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {clientLink ? <CopyButton text={`${window.location.origin}${clientLink}?code=${r.client_code}`} /> : <span className="text-gray-600 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${wBadge.cls}`}>
                              {wBadge.label}
                            </span>
                            {r.phone && (
                              <button
                                onClick={() => sendWhatsApp(r)}
                                disabled={whatsappSending === r.id}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                                title="Envoyer via WhatsApp"
                              >
                                {whatsappSending === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageCircle className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(r)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleCount < filtered.length && (
              <div className="px-6 py-4 border-t border-gray-800 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                >
                  Voir plus ({filtered.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Modifier la réservation' : 'Nouvelle réservation'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prénom</label>
                  <input type="text" required value={form.first_name} onChange={(e) => setField('first_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
                  <input type="text" required value={form.last_name} onChange={(e) => setField('last_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+237 6 XX XX XX XX"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Arrivée</label>
                  <input type="date" required value={form.check_in} onChange={(e) => setField('check_in', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Départ</label>
                  <input type="date" required value={form.check_out} onChange={(e) => setField('check_out', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type de suite</label>
                  <select value={form.suite_type} onChange={(e) => setField('suite_type', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer">
                    {SUITE_TYPES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de personnes</label>
                  <input type="number" min={1} max={20} value={form.guests_count} onChange={(e) => setField('guests_count', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Statut</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value as ReservationStatus)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer">
                  {STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes internes</label>
                <textarea value={form.internal_notes} onChange={(e) => setField('internal_notes', e.target.value)} rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                  placeholder="Notes internes (visibles uniquement par l'administration)" />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                {editingId ? (
                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
                    <button type="submit" disabled={saving}
                      className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <>
                    {/* CONFIRMER ET ENVOYER LE LIEN - primary action */}
                    <button type="button" onClick={handleConfirmAndSend} disabled={saving || !form.first_name || !form.last_name || !form.check_in || !form.check_out}
                      className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Confirmer et envoyer le lien
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t border-gray-800" />
                      <span className="text-xs text-gray-500">ou</span>
                      <div className="flex-1 border-t border-gray-800" />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
                      <button type="submit" disabled={saving}
                        className="inline-flex items-center gap-2 bg-gray-800 text-amber-400 border border-amber-900/30 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Créer sans envoyer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Supprimer la réservation</h3>
                <p className="text-gray-400 text-sm mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer la réservation de{' '}
              <span className="text-white font-medium">{deleteTarget.first_name} {deleteTarget.last_name}</span>{' '}
              ({formatDate(deleteTarget.check_in)} — {formatDate(deleteTarget.check_out)}) ?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
