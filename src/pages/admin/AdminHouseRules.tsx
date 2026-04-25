import { useState, useEffect, useCallback } from 'react';
import { Pencil, Loader2, Save, X, ScrollText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { HouseRule } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminHouseRules() {
  const [houseRule, setHouseRule] = useState<HouseRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editContent, setEditContent] = useState('');

  /* --- fetch --- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('house_rules')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setHouseRule(data as HouseRule);
    } catch (err) {
      console.error('Erreur lors du chargement des regles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* --- edit helpers --- */
  function startEditing() {
    setEditContent(houseRule?.content ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditContent('');
  }

  /* --- save --- */
  async function handleSave() {
    setSaving(true);
    try {
      if (houseRule) {
        const { error } = await supabase
          .from('house_rules')
          .update({ content: editContent })
          .eq('id', houseRule.id);
        if (error) throw error;
      }

      setHouseRule((prev) =>
        prev ? { ...prev, content: editContent } : prev
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
          <h1 className="text-2xl font-bold text-white">Regles de la maison</h1>
          <p className="text-gray-400 text-sm mt-1">
            Regles et consignes pour les clients
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

      {/* Visibility note */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-900/20 rounded-xl p-4">
        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-amber-200 text-sm">
          Ce texte est egalement visible dans l'espace client
        </p>
      </div>

      {/* Content */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Regles de la maison</h2>
        </div>
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-y"
            placeholder="Saisissez les regles de la maison..."
          />
        ) : (
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
            {houseRule?.content || 'Aucune regle renseignee.'}
          </p>
        )}
      </div>
    </div>
  );
}
