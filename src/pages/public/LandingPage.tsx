import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ChevronRight, Shield, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function LandingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [code, setCode] = useState('');
  const [visible, setVisible] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleCodeAccess = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setSearching(true);
    setError('');

    try {
      // Search by client_code to find the reservation and its token
      const { data, error: queryError } = await supabase
        .from('reservations')
        .select('client_token, client_code')
        .eq('client_code', trimmed)
        .limit(1);

      if (queryError) throw queryError;

      if (data && data.length > 0 && data[0].client_token) {
        // Auto-redirect with code parameter for seamless login
        navigate(`/client/${data[0].client_token}?code=${data[0].client_code}`);
      } else {
        setError('Code non trouvé. Vérifiez votre code et réessayez.');
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSearching(false);
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCodeAccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero content */}
      <div className={`flex flex-col items-center text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* LB Gold monogram */}
        <div className="w-24 h-24 rounded-full border-4 border-amber-500 flex items-center justify-center mb-8">
          <span className="text-4xl font-bold text-amber-500">LB</span>
        </div>

        <h1 className="text-4xl text-white font-serif mb-3">LB Prestige Appart</h1>
        <p className="text-amber-400/70 tracking-widest uppercase text-sm mb-2">Conciergerie d&apos;Exception</p>
        <p className="text-gray-400 text-sm mb-8">KOTTO &bull; CARREFOUR DES ROSES &bull; Douala</p>
        <p className="text-xl text-gray-300 mb-10 max-w-md">Votre s&eacute;jour d&apos;exception commence ici.</p>

        <button
          onClick={() => navigate('/client/reserve')}
          className="bg-amber-500 text-gray-950 font-semibold px-8 py-3 rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-2 mb-12"
        >
          R&eacute;server mon s&eacute;jour
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Code access section */}
      <div className={`w-full max-w-sm transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span className="text-gray-300 text-sm font-medium">J&apos;ai d&eacute;j&agrave; un code de connexion</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              onKeyDown={handleCodeKeyDown}
              placeholder="Entrez votre code (ex: EMI-4782)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
            />
            <button
              onClick={handleCodeAccess}
              disabled={!code.trim() || searching}
              className="bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm inline-flex items-center gap-2"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Acc&eacute;der'}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      </div>

      {/* Bottom links */}
      <div className={`w-full max-w-sm mt-6 flex flex-col items-center gap-3 transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <button
          onClick={() => navigate('/admin/login')}
          className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors text-sm"
        >
          <Shield className="w-4 h-4" />
          Espace propri&eacute;taire
        </button>

        {!session && (
          <button
            onClick={() => navigate('/admin/setup')}
            className="flex items-center gap-2 text-gray-500 hover:text-amber-400 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Cr&eacute;er le compte admin
          </button>
        )}
      </div>
    </div>
  );
}
