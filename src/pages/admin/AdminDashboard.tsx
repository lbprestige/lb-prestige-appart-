import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Users,
  MessageSquare,
  Star,
  FileCheck,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Reservation } from '../../types/database';

interface DashboardStats {
  sejoursActifs: number;
  arriveesJour: number;
  departsJour: number;
  totalClients: number;
  messagesNonLus: number;
  avisRecus: number;
  reglementsSignes: number;
  enAttenteSignature: number;
}

interface RecentReservation {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  check_in: string;
  check_out: string;
  client_code: string;
  status: Reservation['status'];
  client_token: string;
  clients?: { first_name: string; last_name: string; phone: string } | { first_name: string; last_name: string; phone: string }[];
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-amber-900/20 rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>
      <div className="h-7 w-12 bg-gray-800 rounded mb-1.5" />
      <div className="h-4 w-24 bg-gray-800 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-800">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  planifiee: { label: 'Planifiée', className: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
  en_cours: { label: 'En cours', className: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  terminee: { label: 'Terminée', className: 'bg-gray-800 text-gray-400 border border-gray-700' },
  annulee: { label: 'Annulée', className: 'bg-red-900/40 text-red-300 border border-red-700/50' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reservations, setReservations] = useState<RecentReservation[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        sejoursActifsRes,
        arriveesRes,
        departsRes,
        clientsRes,
        messagesRes,
        reviewsRes,
        reglementsSignesRes,
        enAttenteSignatureRes,
        reservationsRes,
      ] = await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'en_cours'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', today),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_out', today),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('rules_signed', true),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('rules_signed', false),
        supabase
          .from('reservations')
          .select('id, first_name, last_name, phone, check_in, check_out, client_code, status, client_token, clients(first_name, last_name, phone)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        sejoursActifs: sejoursActifsRes.count ?? 0,
        arriveesJour: arriveesRes.count ?? 0,
        departsJour: departsRes.count ?? 0,
        totalClients: clientsRes.count ?? 0,
        messagesNonLus: messagesRes.count ?? 0,
        avisRecus: reviewsRes.count ?? 0,
        reglementsSignes: reglementsSignesRes.count ?? 0,
        enAttenteSignature: enAttenteSignatureRes.count ?? 0,
      });

      setReservations((reservationsRes.data as unknown as RecentReservation[]) ?? []);
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards: {
    key: keyof DashboardStats;
    label: string;
    icon: React.ElementType;
    color: string;
  }[] = [
    { key: 'sejoursActifs', label: 'Séjour(s) actif(s)', icon: CalendarCheck, color: 'text-amber-400 bg-amber-900/30' },
    { key: 'arriveesJour', label: 'Arrivées du jour', icon: LogIn, color: 'text-green-400 bg-green-900/30' },
    { key: 'departsJour', label: 'Départs du jour', icon: LogOut, color: 'text-orange-400 bg-orange-900/30' },
    { key: 'totalClients', label: 'Total clients', icon: Users, color: 'text-blue-400 bg-blue-900/30' },
    { key: 'messagesNonLus', label: 'Messages non lus', icon: MessageSquare, color: 'text-amber-400 bg-amber-900/30' },
    { key: 'avisRecus', label: 'Avis reçus', icon: Star, color: 'text-amber-400 bg-amber-900/30' },
    { key: 'reglementsSignes', label: 'Règlement signé', icon: FileCheck, color: 'text-green-400 bg-green-900/30' },
    { key: 'enAttenteSignature', label: 'En attente de signature', icon: Clock, color: 'text-orange-400 bg-orange-900/30' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <button
          onClick={() => navigate('/admin/reservations')}
          className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouvelle réservation
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map(({ key, label, icon: Icon, color }) => (
              <div
                key={key}
                className="bg-gray-900 border border-amber-900/20 rounded-xl p-5"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.[key] ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">{label}</p>
              </div>
            ))}
      </div>

      {/* Recent Reservations */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Réservations récentes</h2>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Téléphone</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Période</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Lien</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : reservations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Téléphone</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Période</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Lien</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
                  const displayName = client
                    ? `${client.first_name} ${client.last_name}`
                    : `${r.first_name} ${r.last_name}`;
                  const displayPhone = client?.phone ?? r.phone;
                  const statusCfg = statusConfig[r.status] ?? statusConfig.planifiee;

                  return (
                    <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-white text-sm">{displayName}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{displayPhone || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                        {formatDate(r.check_in)} — {formatDate(r.check_out)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm font-mono">{r.client_code || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.client_token ? (
                          <a
                            href={`/client/${r.client_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
