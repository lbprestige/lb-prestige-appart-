import { useState, useEffect, useCallback } from 'react';
import { Pencil, Loader2, Save, X, DoorOpen, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AccessCode, Property } from '../../types/database';
import { CopyButton } from '../../components/ui/CopyButton';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminAccessCodes() {
  const [accessCode, setAccessCode] = useState<AccessCode | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editDoorCode, setEditDoorCode] = useState('');
  const [editSafeCode, setEditSafeCode] = useState('');
  const [editArrivalInstructions, setEditArrivalInstructions] = useState('');

  /* --- fetch --- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: codes, error: codesError } = await supabase
        .from('access_codes')
        .select('*')
        .limit(1)
        .single();

      if (codesError) throw codesError;
      setAccessCode(codes as AccessCode);

      if (codes?.property_id) {
        const { data: prop, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', codes.property_id)
          .single();

        if (propError) throw propError;
        setProperty(prop as Property);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des codes d\'acces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* --- edit helpers --- */
  function startEditing() {
    setEditDoorCode(accessCode?.door_code ?? '');
    setEditSafeCode(accessCode?.safe_code ?? '');
    setEditArrivalInstructions(property?.arrival_instructions ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditDoorCode('');
    setEditSafeCode('');
    setEditArrivalInstructions('');
  }

  /* --- save --- */
  async function handleSave() {
    setSaving(true);
    try {
      if (accessCode) {
        const { error } = await supabase
          .from('access_codes')
          .update({
            door_code: editDoorCode,
            safe_code: editSafeCode,
          })
          .eq('id', accessCode.id);
        if (error) throw error;
      }

      if (property) {
        const { error } = await supabase
          .from('properties')
          .update({ arrival_instructions: editArrivalInstructions })
          .eq('id', property.id);
        if (error) throw error;
      }

      setAccessCode((prev) =>
        prev ? { ...prev, door_code: editDoorCode, safe_code: editSafeCode } : prev
      );
      setProperty((prev) =>
        prev ? { ...prev, arrival_instructions: editArrivalInstructions } : prev
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
          <h1 className="text-2xl font-bold text-white">Codes d'acces</h1>
          <p className="text-gray-400 text-sm mt-1">
            Codes d'acces a la propriete et instructions d'arrivee
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

      {/* Code cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Door code */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Code porte d'entree</h2>
          </div>
          {editing ? (
            <input
              type="text"
              value={editDoorCode}
              onChange={(e) => setEditDoorCode(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-5xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="0000"
            />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-mono text-amber-400 tracking-widest">
                {accessCode?.door_code || '—'}
              </span>
              {accessCode?.door_code && <CopyButton text={accessCode.door_code} />}
            </div>
          )}
        </div>

        {/* Safe code */}
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Code coffre-fort</h2>
          </div>
          {editing ? (
            <input
              type="text"
              value={editSafeCode}
              onChange={(e) => setEditSafeCode(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-5xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="0000"
            />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-mono text-amber-400 tracking-widest">
                {accessCode?.safe_code || '—'}
              </span>
              {accessCode?.safe_code && <CopyButton text={accessCode.safe_code} />}
            </div>
          )}
        </div>
      </div>

      {/* Arrival instructions */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Instructions d'arrivee
        </h2>
        {editing ? (
          <textarea
            value={editArrivalInstructions}
            onChange={(e) => setEditArrivalInstructions(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-y"
            placeholder="Instructions pour l'arrivee des clients..."
          />
        ) : (
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
            {property?.arrival_instructions || 'Aucune instruction renseignee.'}
          </p>
        )}
      </div>
    </div>
  );
}
