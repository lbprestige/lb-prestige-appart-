import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { signIn, session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate('/admin/accueil', { replace: true });
    }
  }, [session, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setSubmitting(false);
      return;
    }

    navigate('/admin/accueil', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-amber-900/30 rounded-2xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-amber-500">LB</span>
            </div>
            <h1 className="text-2xl text-white font-serif mb-1">
              Connexion propri&eacute;taire
            </h1>
            <p className="text-gray-400 text-sm">
              Acc&eacute;dez &agrave; votre espace de gestion
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="proprietaire@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 text-gray-950 font-semibold py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors text-sm mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour &agrave; l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
