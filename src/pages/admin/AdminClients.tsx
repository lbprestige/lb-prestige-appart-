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
  ChevronRight,
  Users,
  Phone,
  Mail,
  ExternalLink,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Client, Reservation } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const statusBadge: Record<string, { label: string; cls: string }> = {
  planifiee: { label: 'Planifiée', cls: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
  en_cours: { label: 'En cours', cls: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  terminee: { label: 'Terminée', cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
  annulee: { label: 'Annulée', cls: 'bg-red-900/40 text-red-300 border border-red-700/50' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Form data type                                                     */
/* ------------------------------------------------------------------ */

interface ClientFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: ClientFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminClients() {
  /* --- state --- */
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientReservations, setClientReservations] = useState<Record<string, Reservation[]>>({});
  const [loadingReservations, setLoadingReservations] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* --- fetch clients --- */
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setClients((data as Client[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /* --- fetch reservation count for all clients --- */
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchCounts() {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('client_id');

        if (error) throw error;

        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          if (row.client_id) {
            counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
          }
        }
        setReservationCounts(counts);
      } catch (err) {
        console.error('Erreur lors du comptage des réservations:', err);
      }
    }

    fetchClients();
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- expand / collapse reservation history --- */
  async function toggleExpand(clientId: string) {
    if (expandedId === clientId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(clientId);

    if (clientReservations[clientId]) return;

    setLoadingReservations((prev) => ({ ...prev, [clientId]: true }));
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('client_id', clientId)
        .order('check_in', { ascending: false });

      if (error) throw error;
      setClientReservations((prev) => ({
        ...prev,
        [clientId]: (data as Reservation[]) ?? [],
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des réservations du client:', err);
    } finally {
      setLoadingReservations((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  /* --- filtering --- */
  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  /* --- modal helpers --- */
  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(c: Client) {
    setEditingId(c.id);
    setForm({
      first_name: c.first_name ?? '',
      last_name: c.last_name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      notes: c.notes ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setField<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* --- create / update --- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('clients')
          .update({
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            email: form.email,
            notes: form.notes,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
        });
        if (error) throw error;
      }

      closeModal();
      fetchClients();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  /* --- delete --- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      setExpandedId(null);
      fetchClients();
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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez votre carnet de clients ({filtered.length} client{filtered.length !== 1 ? 's' : ''})
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Créer un client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Client cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-amber-900/20 rounded-xl px-6 py-16 text-center">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const isExpanded = expandedId === client.id;
            const reservations = clientReservations[client.id] ?? [];
            const count = reservationCounts[client.id] ?? 0;
            const isLoadingRes = loadingReservations[client.id];

            return (
              <div
                key={client.id}
                className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden transition-colors"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800/40 transition-colors"
                  onClick={() => toggleExpand(client.id)}
                >
                  {/* Expand chevron */}
                  <div className="shrink-0 text-amber-400">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 border border-amber-700/40 flex items-center justify-center text-amber-400 font-semibold text-sm">
                    {client.first_name?.charAt(0)?.toUpperCase() ?? ''}
                    {client.last_name?.charAt(0)?.toUpperCase() ?? ''}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      {client.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                      )}
                      {client.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          {client.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reservation count badge */}
                  <div className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-700/40">
                    {count} réservation{count !== 1 ? 's' : ''}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(client);
                      }}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(client);
                      }}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded: reservation history */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-gray-950/50">
                    {isLoadingRes ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <span className="ml-2 text-gray-500 text-sm">Chargement des réservations...</span>
                      </div>
                    ) : reservations.length === 0 ? (
                      <div className="px-6 py-8 text-center text-gray-500 text-sm">
                        Aucune réservation pour ce client
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-800/60">
                        {reservations.map((r) => {
                          const badge = statusBadge[r.status] ?? statusBadge.planifiee;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-900/60 transition-colors"
                            >
                              {/* Date icon */}
                              <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                                <CalendarDays className="w-4 h-4" />
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium">
                                  {r.suite_type || 'Réservation'}
                                </div>
                                <div className="text-gray-400 text-xs mt-0.5">
                                  {formatDate(r.check_in)} — {formatDate(r.check_out)}
                                  {r.guests_count ? ` · ${r.guests_count} personne${r.guests_count > 1 ? 's' : ''}` : ''}
                                </div>
                              </div>

                              {/* Status */}
                              <span
                                className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                              >
                                {badge.label}
                              </span>

                              {/* Client space link */}
                              {r.client_token ? (
                                <a
                                  href={`/client/${r.client_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors text-xs font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Voir espace client
                                </a>
                              ) : (
                                <span className="shrink-0 text-gray-600 text-xs">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Modifier le client' : 'Créer un client'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setField('first_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Phone / Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                  placeholder="Notes sur le client (préférences, informations diverses...)"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Enregistrer' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
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
                <h3 className="text-white font-semibold">Supprimer le client</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer le client{' '}
              <span className="text-white font-medium">
                {deleteTarget.first_name} {deleteTarget.last_name}
              </span>{' '}
              ? Les réservations associées ne seront pas supprimées.
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
