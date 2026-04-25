import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Trash2,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Review, Client, Reservation } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type PublishFilter = 'all' | 'published' | 'unpublished';

const PUBLISH_FILTER_OPTIONS: { value: PublishFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'published', label: 'Publiées' },
  { value: 'unpublished', label: 'Non publiées' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Extended type for joined data                                      */
/* ------------------------------------------------------------------ */

interface ReviewWithClient extends Review {
  clients?: Client;
  reservations?: Reservation & { clients?: Client };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminReviews() {
  /* --- state --- */
  const [reviews, setReviews] = useState<ReviewWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all');

  const [deleteTarget, setDeleteTarget] = useState<ReviewWithClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* --- fetch reviews with client and reservation info --- */
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          clients(id, first_name, last_name, email),
          reservations(id, check_in, check_out, first_name, last_name, clients(id, first_name, last_name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data as ReviewWithClient[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des avis:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* --- filtering --- */
  const filtered = reviews.filter((r) => {
    if (publishFilter === 'published' && !r.published) return false;
    if (publishFilter === 'unpublished' && r.published) return false;
    return true;
  });

  /* --- average rating --- */
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const publishedCount = reviews.filter((r) => r.published).length;
  const unpublishedCount = reviews.filter((r) => !r.published).length;

  /* --- client name helper --- */
  function getClientName(review: ReviewWithClient): string {
    if (review.clients) {
      const c = Array.isArray(review.clients) ? review.clients[0] : review.clients;
      if (c?.first_name || c?.last_name) {
        return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
      }
    }
    if (review.reservations?.first_name || review.reservations?.last_name) {
      return `${review.reservations.first_name ?? ''} ${review.reservations.last_name ?? ''}`.trim();
    }
    return 'Client inconnu';
  }

  /* --- toggle published --- */
  async function togglePublished(review: ReviewWithClient) {
    setTogglingId(review.id);
    try {
      const newPublished = !review.published;
      const { error } = await supabase
        .from('reviews')
        .update({ published: newPublished })
        .eq('id', review.id);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, published: newPublished } : r))
      );
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
    } finally {
      setTogglingId(null);
    }
  }

  /* --- delete --- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchReviews();
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
          <h1 className="text-2xl font-bold text-white">Avis clients</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez les avis et témoignages ({reviews.length} avis)
          </p>
        </div>
      </div>

      {/* Stats + Average Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average rating card */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-700/40 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {averageRating.toFixed(1)}
              <span className="text-gray-500 text-sm font-normal"> / 5</span>
            </div>
            <div className="text-gray-400 text-xs mt-0.5">Note moyenne</div>
          </div>
        </div>

        {/* Published count */}
        <div className="bg-gray-900 border border-green-900/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-700/40 flex items-center justify-center">
            <Eye className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{publishedCount}</div>
            <div className="text-gray-400 text-xs mt-0.5">Avis publiés</div>
          </div>
        </div>

        {/* Unpublished count */}
        <div className="bg-gray-900 border border-gray-700/30 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-700/30 border border-gray-600/40 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{unpublishedCount}</div>
            <div className="text-gray-400 text-xs mt-0.5">Avis non publiés</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Filtrer :</span>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
          >
            {PUBLISH_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Review cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-amber-900/20 rounded-xl px-6 py-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucun avis trouvé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const clientName = getClientName(review);
            const isToggling = togglingId === review.id;

            return (
              <div
                key={review.id}
                className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
                  review.published
                    ? 'border-amber-900/20'
                    : 'border-gray-700/40 opacity-80'
                }`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 border border-amber-700/40 flex items-center justify-center text-amber-400 font-semibold text-sm">
                      {clientName.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + date row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-white font-medium text-sm">{clientName}</span>
                        <span className="text-gray-500 text-xs">
                          {formatDate(review.created_at)}
                        </span>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            review.published
                              ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {review.published ? 'Publié' : 'Non publié'}
                        </span>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-gray-400 text-xs">
                          ({review.rating}/5)
                        </span>
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                          {review.comment}
                        </p>
                      )}

                      {/* Reservation info */}
                      {review.reservations && (
                        <p className="text-gray-500 text-xs mt-2">
                          Séjour : {formatDate(review.reservations.check_in)} — {formatDate(review.reservations.check_out)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => togglePublished(review)}
                        disabled={isToggling}
                        className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                          review.published
                            ? 'text-green-400 hover:bg-green-500/20'
                            : 'text-amber-400 hover:bg-amber-500/20'
                        } disabled:opacity-50`}
                        title={review.published ? 'Dépublier' : 'Publier'}
                      >
                        {isToggling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : review.published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(review)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
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
                <h3 className="text-white font-semibold">Supprimer l'avis</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer l'avis de{' '}
              <span className="text-white font-medium">
                {getClientName(deleteTarget)}
              </span>{' '}
              ({deleteTarget.rating}/5) ?
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
