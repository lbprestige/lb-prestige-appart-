import { useState, useEffect, useCallback } from 'react';
import { Pencil, Loader2, Save, X, Wifi, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WifiSetting } from '../../types/database';
import { CopyButton } from '../../components/ui/CopyButton';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminWifi() {
  const [wifiSetting, setWifiSetting] = useState<WifiSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editNetworkName, setEditNetworkName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  /* --- fetch --- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wifi_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setWifiSetting(data as WifiSetting);
    } catch (err) {
      console.error('Erreur lors du chargement des parametres Wi-Fi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* --- edit helpers --- */
  function startEditing() {
    setEditNetworkName(wifiSetting?.network_name ?? '');
    setEditPassword(wifiSetting?.password ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditNetworkName('');
    setEditPassword('');
  }

  /* --- save --- */
  async function handleSave() {
    setSaving(true);
    try {
      if (wifiSetting) {
        const { error } = await supabase
          .from('wifi_settings')
          .update({
            network_name: editNetworkName,
            password: editPassword,
          })
          .eq('id', wifiSetting.id);
        if (error) throw error;
      }

      setWifiSetting((prev) =>
        prev ? { ...prev, network_name: editNetworkName, password: editPassword } : prev
      );
      setEditing(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  /* --- render --- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wi-Fi</h1>
          <p className="text-gray-400 text-sm mt-1">
            Parametres de connexion Wi-Fi de la propriete
          </p>
        </div>
        {!editing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
          >
            <Pencil className="w-4 h-4" />
            Modifier
          </button>
        ) : (
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={cancelEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-xl border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Wi-Fi cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Network name */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Nom du reseau (SSID)</h2>
          </div>
          {editing ? (
            <input
              type="text"
              value={editNetworkName}
              onChange={(e) => setEditNetworkName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-3xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="Nom du reseau"
            />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono text-amber-400 tracking-wide">
                {wifiSetting?.network_name || '—'}
              </span>
              {wifiSetting?.network_name && <CopyButton text={wifiSetting.network_name} />}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Mot de passe Wi-Fi</h2>
          </div>
          {editing ? (
            <input
              type="text"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-3xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="Mot de passe"
            />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono text-amber-400 tracking-wide">
                {wifiSetting?.password || '—'}
              </span>
              {wifiSetting?.password && <CopyButton text={wifiSetting.password} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
