import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  X,
  Download,
  FileText,
  Image,
  AlertTriangle,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UsefulDocument } from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-amber-400" />;
  return <FileText className="w-5 h-5 text-amber-400" />;
}

function getFileTypeBadge(fileType: string): string {
  if (fileType === 'application/pdf') return 'bg-red-900/40 text-red-300 border border-red-700/50';
  if (fileType.startsWith('image/')) return 'bg-green-900/40 text-green-300 border border-green-700/50';
  return 'bg-gray-800 text-gray-400 border border-gray-700';
}

function getFileTypeLabel(fileType: string): string {
  if (fileType === 'application/pdf') return 'PDF';
  if (fileType.startsWith('image/')) return 'Image';
  return 'Fichier';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminDocuments() {
  const [documents, setDocuments] = useState<UsefulDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UsefulDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --- fetch --- */
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('useful_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as UsefulDocument[]) ?? []);
    } catch (err) {
      console.error('Erreur lors du chargement des documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /* --- modal helpers --- */
  function openModal() {
    setUploadTitle('');
    setUploadFile(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setUploadTitle('');
    setUploadFile(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  }

  /* --- upload --- */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;

    setUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const storagePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadFile);

      if (uploadError) throw uploadError;

      const fileSize = uploadFile.size < 1024 * 1024
        ? `${(uploadFile.size / 1024).toFixed(1)} Ko`
        : `${(uploadFile.size / (1024 * 1024)).toFixed(1)} Mo`;

      const { error: insertError } = await supabase.from('useful_documents').insert({
        property_id: documents[0]?.property_id ?? '',
        title: uploadTitle.trim(),
        file_type: uploadFile.type,
        file_size: fileSize,
        storage_path: storagePath,
      });

      if (insertError) throw insertError;

      closeModal();
      fetchDocuments();
    } catch (err) {
      console.error('Erreur lors de l\'ajout du document:', err);
    } finally {
      setUploading(false);
    }
  }

  /* --- download --- */
  function handleDownload(doc: UsefulDocument) {
    const { data } = supabase.storage.from('documents').getPublicUrl(doc.storage_path);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  }

  /* --- delete --- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([deleteTarget.storage_path]);

      if (storageError) console.error('Erreur suppression storage:', storageError);

      const { error: dbError } = await supabase
        .from('useful_documents')
        .delete()
        .eq('id', deleteTarget.id);

      if (dbError) throw dbError;

      setDeleteTarget(null);
      fetchDocuments();
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
          <h1 className="text-2xl font-bold text-white">Documents utiles</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerez les documents disponibles pour les clients
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Ajouter un document
        </button>
      </div>

      {/* Visibility note */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-900/20 rounded-xl p-4">
        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-amber-200 text-sm">
          Ces documents sont visibles dans l'espace client
        </p>
      </div>

      {/* Document list */}
      <div className="bg-gray-900 border border-amber-900/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Aucun document pour le moment</p>
            <p className="text-gray-600 text-sm mt-1">
              Cliquez sur "Ajouter un document" pour commencer
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/40 transition-colors"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getFileTypeBadge(doc.file_type)}`}
                    >
                      {getFileTypeLabel(doc.file_type)}
                    </span>
                    <span className="text-gray-500 text-xs">{doc.file_size}</span>
                    <span className="text-gray-500 text-xs">{formatDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                    title="Telecharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Upload Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold text-white">Ajouter un document</h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpload} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Titre du document
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Ex: Guide de la propriete"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Fichier (PDF ou image)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 px-6 py-8 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors"
                >
                  {uploadFile ? (
                    <>
                      <FileText className="w-8 h-8 text-amber-400" />
                      <p className="text-white text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-gray-500 text-xs">
                        {uploadFile.size < 1024 * 1024
                          ? `${(uploadFile.size / 1024).toFixed(1)} Ko`
                          : `${(uploadFile.size / (1024 * 1024)).toFixed(1)} Mo`}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-600" />
                      <p className="text-gray-400 text-sm">
                        Cliquez pour selectionner un fichier
                      </p>
                      <p className="text-gray-600 text-xs">PDF, JPG, PNG</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
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
                  disabled={uploading || !uploadFile || !uploadTitle.trim()}
                  className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ajouter le document
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
                <h3 className="text-white font-semibold">Supprimer le document</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Cette action est irreversible.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer le document{' '}
              <span className="text-white font-medium">{deleteTarget.title}</span> ?
              Le fichier sera egalement supprime du stockage.
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
