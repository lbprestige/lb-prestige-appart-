import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  ChevronDown,
  DollarSign,
  Clock,
  CheckCircle2,
  Banknote,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Payment, PaymentStatus, Reservation, Client } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'acompte_paye', label: 'Acompte payé' },
  { value: 'paye', label: 'Payé' },
  { value: 'rembourse', label: 'Remboursé' },
];

const statusBadge: Record<PaymentStatus, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50' },
  acompte_paye: { label: 'Acompte payé', cls: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
  paye: { label: 'Payé', cls: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  rembourse: { label: 'Remboursé', cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Extended types for joined data                                     */
/* ------------------------------------------------------------------ */

interface PaymentWithReservation extends Payment {
  reservations?: Reservation & { clients?: Client | Client[] };
}

interface ReservationOption {
  id: string;
  label: string;
  check_in: string;
  check_out: string;
}

/* ------------------------------------------------------------------ */
/*  Form data type                                                     */
/* ------------------------------------------------------------------ */

interface PaymentFormData {
  reservation_id: string;
  status: PaymentStatus;
  amount: number;
  deposit: number;
  balance: number;
  reference: string;
  notes: string;
}

const EMPTY_FORM: PaymentFormData = {
  reservation_id: '',
  status: 'en_attente',
  amount: 0,
  deposit: 0,
  balance: 0,
  reference: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminPayments() {
  /* --- state --- */
  const [payments, setPayments] = useState<PaymentWithReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentWithReservation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [reservations, setReservations] = useState<ReservationOption[]>([]);

  /* --- fetch payments with reservation + client info --- */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          reservations(id, check_in, check_out, first_name, last_name, clients(id, first_name, last_name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as PaymentWithReservation[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des paiements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* --- fetch reservations for dropdown --- */
  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, first_name, last_name, check_in, check_out')
        .order('check_in', { ascending: false });

      if (error) throw error;
      setReservations(
        (data ?? []).map((r) => ({
          id: r.id,
          label: `${r.first_name} ${r.last_name}`,
          check_in: r.check_in,
          check_out: r.check_out,
        }))
      );
    } catch (err) {
      console.error('Erreur lors du chargement des réservations:', err);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchReservations();
  }, [fetchPayments, fetchReservations]);

  /* --- summary stats --- */
  const totalRevenue = payments
    .filter((p) => p.status === 'paye')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingBalance = payments
    .filter((p) => p.status === 'en_attente' || p.status === 'acompte_paye')
    .reduce((sum, p) => sum + p.balance, 0);

  const paidCount = payments.filter((p) => p.status === 'paye').length;
  const pendingCount = payments.filter((p) => p.status === 'en_attente' || p.status === 'acompte_paye').length;

  /* --- client name helper --- */
  function getClientName(payment: PaymentWithReservation): string {
    if (payment.reservations) {
      const res = payment.reservations;
      if (res.first_name || res.last_name) {
        return `${res.first_name ?? ''} ${res.last_name ?? ''}`.trim();
      }
      if (res.clients) {
        const c = Array.isArray(res.clients) ? res.clients[0] : res.clients;
        if (c?.first_name || c?.last_name) {
          return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
        }
      }
    }
    return 'Client inconnu';
  }

  /* --- reservation period helper --- */
  function getPeriod(payment: PaymentWithReservation): string {
    if (payment.reservations) {
      return `${formatDate(payment.reservations.check_in)} — ${formatDate(payment.reservations.check_out)}`;
    }
    return '—';
  }

  /* --- modal helpers --- */
  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(p: PaymentWithReservation) {
    setEditingId(p.id);
    setForm({
      reservation_id: p.reservation_id,
      status: p.status,
      amount: p.amount,
      deposit: p.deposit,
      balance: p.balance,
      reference: p.reference,
      notes: p.notes,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setField<K extends keyof PaymentFormData>(key: K, value: PaymentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* --- create / update --- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('payments')
          .update({
            status: form.status,
            amount: form.amount,
            deposit: form.deposit,
            balance: form.balance,
            reference: form.reference,
            notes: form.notes,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payments').insert({
          reservation_id: form.reservation_id,
          status: form.status,
          amount: form.amount,
          deposit: form.deposit,
          balance: form.balance,
          reference: form.reference,
          notes: form.notes,
        });
        if (error) throw error;
      }

      closeModal();
      fetchPayments();
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
      const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchPayments();
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
          <h1 className="text-2xl font-bold text-white">Paiements</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez les paiements et factures ({payments.length} paiement{payments.length !== 1 ? 's' : ''})
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouveau paiement
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="bg-gray-900 border border-green-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-500/20 border border-green-700/40 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalRevenue)}</div>
            <div className="text-gray-400 text-xs mt-0.5">Revenus totaux</div>
          </div>
        </div>

        {/* Pending balance */}
        <div className="bg-gray-900 border border-yellow-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-yellow-500/20 border border-yellow-700/40 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{formatCurrency(pendingBalance)}</div>
            <div className="text-gray-400 text-xs mt-0.5">Solde en attente</div>
          </div>
        </div>

        {/* Paid count */}
        <div className="bg-gray-900 border border-green-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-500/20 border border-green-700/40 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{paidCount}</div>
            <div className="text-gray-400 text-xs mt-0.5">Paiements réglés</div>
          </div>
        </div>

        {/* Pending count */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-700/40 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{pendingCount}</div>
            <div className="text-gray-400 text-xs mt-0.5">En attente</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Banknote className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Aucun paiement trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Période</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Montant</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Acompte</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Solde</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Référence</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badge = statusBadge[p.status] ?? statusBadge.en_attente;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {getClientName(p)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                        {getPeriod(p)}
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatCurrency(p.deposit)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatCurrency(p.balance)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">
                        {p.reference || '—'}
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
                          <button
                            onClick={() => openEditModal(p)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
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
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Modifier le paiement' : 'Nouveau paiement'}
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
              {/* Reservation (only for create) */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Réservation</label>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <select
                      required
                      value={form.reservation_id}
                      onChange={(e) => setField('reservation_id', e.target.value)}
                      className="w-full appearance-none pl-3 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                    >
                      <option value="">Sélectionner une réservation</option>
                      {reservations.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label} ({formatDate(r.check_in)} — {formatDate(r.check_out)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Statut</label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value as PaymentStatus)}
                    className="w-full appearance-none pl-3 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Montant total</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount}
                  onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              {/* Deposit + Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Acompte</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.deposit}
                    onChange={(e) => setField('deposit', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Solde</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.balance}
                    onChange={(e) => setField('balance', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Référence</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setField('reference', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Numéro de référence ou de facture"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                  placeholder="Notes sur le paiement"
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
                  {editingId ? 'Enregistrer' : 'Créer le paiement'}
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
                <h3 className="text-white font-semibold">Supprimer le paiement</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer le paiement de{' '}
              <span className="text-white font-medium">
                {formatCurrency(deleteTarget.amount)}
              </span>{' '}
              pour <span className="text-white font-medium">{getClientName(deleteTarget)}</span> ?
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
