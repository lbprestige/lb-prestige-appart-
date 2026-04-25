import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  KeyRound,
  Wifi,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
  Download,
  Send,
  Loader2,
  Star,
  MessageSquare,
  Home,
  AlertCircle,
  Check,
  Tv,
  Car,
  ChefHat,
  PenLine,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  Reservation,
  Client,
  Property,
  AccessCode,
  WifiSetting,
  HouseRule,
  UsefulContact,
  UsefulDocument,
  Message,
  Review,
} from '../../types/database';
import { CopyButtonLight } from '../../components/ui/CopyButton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'sejour' | 'message' | 'avis';

interface ReservationData {
  reservation: Reservation;
  client: Client;
  property: Property;
  accessCodes: AccessCode | null;
  wifiSettings: WifiSetting | null;
  houseRules: HouseRule[];
  usefulContacts: UsefulContact[];
  usefulDocuments: UsefulDocument[];
  messages: Message[];
  review: Review | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diff = outDate.getTime() - inDate.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function getClientName(reservation: Reservation, client: Client): string {
  if (client?.first_name) return client.first_name;
  if (reservation?.first_name) return reservation.first_name;
  return '';
}

/* ------------------------------------------------------------------ */
/*  Invalid Token Page                                                 */
/* ------------------------------------------------------------------ */

function InvalidTokenPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full border-2 border-amber-300 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-stone-800 mb-3">Lien invalide</h1>
        <p className="text-stone-500 mb-8">
          Ce lien d&apos;acc&egrave;s n&apos;est pas valide ou a expir&eacute;.
          Veuillez v&eacute;rifier le lien ou contacter votre concierge.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          Retour &agrave; l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Page                                                      */
/* ------------------------------------------------------------------ */

function LoadingPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-stone-400 text-sm">Chargement de votre espace...</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive Concierge Card                                         */
/* ------------------------------------------------------------------ */

function ConciergeCard({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-stone-700">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Mon sejour (Interactive)                                     */
/* ------------------------------------------------------------------ */

function TabSejour({
  data,
  onRulesSigned,
}: {
  data: ReservationData;
  onRulesSigned: () => void;
}) {
  const { reservation, property, accessCodes, wifiSettings, houseRules, usefulContacts, usefulDocuments } = data;
  const nights = calculateNights(reservation.check_in, reservation.check_out);
  const [rulesSigned, setRulesSigned] = useState(reservation.rules_signed ?? false);
  const [signing, setSigning] = useState(false);

  async function signRules() {
    setSigning(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          rules_signed: true,
          rules_signed_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (error) throw error;
      setRulesSigned(true);
      onRulesSigned();
    } catch (err) {
      console.error('Erreur signature:', err);
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Reservation details */}
      <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
          D&eacute;tails du s&eacute;jour
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400">Arriv&eacute;e</p>
              <p className="text-sm font-medium text-stone-800">{formatDateLong(reservation.check_in)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400">D&eacute;part</p>
              <p className="text-sm font-medium text-stone-800">{formatDateLong(reservation.check_out)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400">Dur&eacute;e</p>
              <p className="text-sm font-medium text-stone-800">{nights} nuit{nights > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400">Suite</p>
              <p className="text-sm font-medium text-stone-800">{reservation.suite_type || property?.name || 'Appartement'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Access codes */}
      {accessCodes && (accessCodes.door_code || accessCodes.safe_code) && (
        <ConciergeCard icon={KeyRound} title="Codes d'acc&egrave;s" defaultOpen={true}>
          <div className="space-y-3">
            {accessCodes.door_code && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Code porte</p>
                  <p className="text-2xl font-mono font-bold text-stone-800 tracking-widest">{accessCodes.door_code}</p>
                </div>
                <CopyButtonLight text={accessCodes.door_code} />
              </div>
            )}
            {accessCodes.safe_code && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Code coffre</p>
                  <p className="text-2xl font-mono font-bold text-stone-800 tracking-widest">{accessCodes.safe_code}</p>
                </div>
                <CopyButtonLight text={accessCodes.safe_code} />
              </div>
            )}
            {property?.arrival_instructions && (
              <div className="mt-3 pt-3 border-t border-amber-100">
                <p className="text-xs text-stone-400 mb-1.5">Instructions d&apos;arriv&eacute;e</p>
                <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{property.arrival_instructions}</p>
              </div>
            )}
          </div>
        </ConciergeCard>
      )}

      {/* Wi-Fi */}
      {wifiSettings && (wifiSettings.network_name || wifiSettings.password) && (
        <ConciergeCard icon={Wifi} title="Wi-Fi" defaultOpen={true}>
          <div className="space-y-3">
            {wifiSettings.network_name && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">R&eacute;seau</p>
                  <p className="text-lg font-semibold text-stone-800">{wifiSettings.network_name}</p>
                </div>
                <CopyButtonLight text={wifiSettings.network_name} />
              </div>
            )}
            {wifiSettings.password && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Mot de passe</p>
                  <p className="text-lg font-mono font-semibold text-stone-800">{wifiSettings.password}</p>
                </div>
                <CopyButtonLight text={wifiSettings.password} />
              </div>
            )}
          </div>
        </ConciergeCard>
      )}

      {/* Netflix */}
      {property && (property.netflix_username || property.netflix_password) && (
        <ConciergeCard icon={Tv} title="Netflix">
          <div className="space-y-3">
            {property.netflix_username && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Identifiant</p>
                  <p className="text-lg font-semibold text-stone-800">{property.netflix_username}</p>
                </div>
                <CopyButtonLight text={property.netflix_username} />
              </div>
            )}
            {property.netflix_password && (
              <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Mot de passe</p>
                  <p className="text-lg font-mono font-semibold text-stone-800">{property.netflix_password}</p>
                </div>
                <CopyButtonLight text={property.netflix_password} />
              </div>
            )}
            {property.netflix_instructions && (
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 rounded-xl px-4 py-3">{property.netflix_instructions}</p>
            )}
          </div>
        </ConciergeCard>
      )}

      {/* Parking */}
      {property?.parking_instructions && (
        <ConciergeCard icon={Car} title="Parking">
          <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 rounded-xl px-4 py-3">
            {property.parking_instructions}
          </p>
        </ConciergeCard>
      )}

      {/* Cuisine */}
      {property?.kitchen_instructions && (
        <ConciergeCard icon={ChefHat} title="Cuisine">
          <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 rounded-xl px-4 py-3">
            {property.kitchen_instructions}
          </p>
        </ConciergeCard>
      )}

      {/* House rules + Digital Signature */}
      {houseRules.length > 0 && (
        <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-stone-700">R&egrave;glement int&eacute;rieur</span>
            </div>
            <div className="space-y-3">
              {houseRules.map((rule) => (
                <div key={rule.id} className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 rounded-xl px-4 py-3">
                  {rule.content}
                </div>
              ))}
            </div>
          </div>

          {/* Signature section */}
          <div className="border-t border-amber-100 px-5 py-4 bg-amber-50/30">
            {rulesSigned ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700">R&egrave;glement sign&eacute;</p>
                  <p className="text-xs text-stone-400">
                    {reservation.rules_signed_at
                      ? new Date(reservation.rules_signed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Signature enregistr&eacute;e'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-stone-600 mb-3">
                  Vous devez signer le r&egrave;glement int&eacute;rieur pour confirmer votre acceptation.
                </p>
                <button
                  onClick={signRules}
                  disabled={signing}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                  Signer le r&egrave;glement
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Useful contacts */}
      {usefulContacts.length > 0 && (
        <ConciergeCard icon={Phone} title="Contacts utiles">
          <div className="space-y-3">
            {usefulContacts.map((contact) => (
              <div key={contact.id} className="bg-stone-50 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-stone-800 mb-1">{contact.label}</p>
                <div className="flex flex-wrap items-center gap-4">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 transition-colors">
                      <Phone className="w-3.5 h-3.5" />{contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 transition-colors">
                      <Mail className="w-3.5 h-3.5" />{contact.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ConciergeCard>
      )}

      {/* Useful documents */}
      {usefulDocuments.length > 0 && (
        <ConciergeCard icon={FileText} title="Documents utiles">
          <div className="space-y-3">
            {usefulDocuments.map((doc) => {
              const { data: urlData } = supabase.storage.from('documents').getPublicUrl(doc.storage_path);
              const publicUrl = urlData?.publicUrl || '';
              return (
                <div key={doc.id} className="flex items-center gap-4 bg-stone-50 rounded-xl px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{doc.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {doc.file_type === 'application/pdf' ? 'PDF' : doc.file_type?.startsWith('image/') ? 'Image' : 'Fichier'}
                      {doc.file_size ? ` \u00b7 ${doc.file_size}` : ''}
                    </p>
                  </div>
                  {publicUrl && (
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shrink-0"
                      title="T&eacute;l&eacute;charger">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </ConciergeCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Message                                                      */
/* ------------------------------------------------------------------ */

function TabMessage({ data }: { data: ReservationData }) {
  const { reservation, messages: initialMessages } = data;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel('client-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `reservation_id=eq.${reservation.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reservation.id]);

  useEffect(() => {
    const unreadAdminMsgs = messages.filter((m) => m.sender === 'admin' && !m.read_at);
    if (unreadAdminMsgs.length > 0) {
      supabase.from('messages').update({ read_at: new Date().toISOString() })
        .eq('reservation_id', reservation.id).eq('sender', 'admin').is('read_at', null)
        .then(() => {
          setMessages((prev) => prev.map((m) => m.sender === 'admin' && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m));
        });
    }
  }, [messages.length, reservation.id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from('messages').insert({
        reservation_id: reservation.id, client_id: reservation.client_id, sender: 'client', content,
      }).select().single();
      if (error) throw error;
      setMessages((prev) => [...prev, data as Message]);
      setMessageInput('');
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
    } finally {
      setSending(false);
    }
  }

  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden"
      style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {sortedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="w-10 h-10 text-stone-300 mb-3" />
            <p className="text-stone-400 text-sm">Aucun message pour le moment</p>
            <p className="text-stone-300 text-xs mt-1">Posez une question &agrave; votre concierge</p>
          </div>
        )}
        {sortedMessages.map((msg) => {
          const isClient = msg.sender === 'client';
          return (
            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isClient ? 'bg-amber-100 text-stone-800 rounded-br-md' : 'bg-stone-100 text-stone-800 rounded-bl-md'}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-stone-400">{formatTime(msg.created_at)}</span>
                  {isClient && msg.read_at && <Check className="w-3 h-3 text-amber-500" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-amber-100 bg-stone-50/50">
        <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-stone-800 text-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
        <button type="submit" disabled={!messageInput.trim() || sending}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Laisser un avis (at bottom)                                  */
/* ------------------------------------------------------------------ */

function TabAvis({ data, onReviewSubmitted }: { data: ReservationData; onReviewSubmitted: () => void }) {
  const { reservation, review } = data;
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!review);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        reservation_id: reservation.id, client_id: reservation.client_id, rating, comment: comment.trim(), published: false,
      });
      if (error) throw error;
      setSubmitted(true);
      onReviewSubmitted();
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'avis:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-amber-100 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
        </div>
        <h3 className="text-lg font-serif font-bold text-stone-800 mb-2">Vous avez d&eacute;j&agrave; laiss&eacute; un avis</h3>
        <p className="text-stone-500 text-sm">Merci pour votre retour&nbsp;! Votre concierge appr&eacute;cie votre avis.</p>
        {review && (
          <div className="mt-6 inline-flex items-center gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`w-5 h-5 ${star <= (review.rating || rating) ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-serif font-bold text-stone-800 mb-6">Laisser un avis</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-sm text-stone-500 mb-3">Votre note</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110">
                <Star className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating) ? 'text-amber-500 fill-amber-500' : 'text-stone-300 hover:text-amber-300'}`} />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-stone-400">
                {rating === 1 && 'Mauvais'}{rating === 2 && 'Passable'}{rating === 3 && 'Bien'}{rating === 4 && 'Tr&egrave;s bien'}{rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-stone-500 mb-2">Votre commentaire (optionnel)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            className="w-full px-4 py-3 bg-stone-50 border border-amber-200 rounded-xl text-stone-800 text-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
            placeholder="Partagez votre exp&eacute;rience..." />
        </div>
        <button type="submit" disabled={rating === 0 || submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-semibold px-8 py-3 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours...</> : <><Star className="w-4 h-4" />Envoyer mon avis</>}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ClientSpace() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [data, setData] = useState<ReservationData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sejour');
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  const fetchData = useCallback(async () => {
    if (!token) { setInvalid(true); setLoading(false); return; }

    setLoading(true);
    try {
      const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .select('*, clients(*)')
        .eq('client_token', token)
        .maybeSingle();

      if (resError || !reservation) { setInvalid(true); setLoading(false); return; }

      const client = Array.isArray(reservation.clients) ? reservation.clients[0] : reservation.clients;
      if (!client) { setInvalid(true); setLoading(false); return; }

      /* Auto-verify code from URL parameter */
      const codeParam = searchParams.get('code');
      if (codeParam && codeParam !== reservation.client_code) {
        // Code mismatch - still show the page but log it
        console.warn('Code parameter mismatch');
      }

      const { data: property } = await supabase.from('properties').select('*').eq('id', reservation.property_id).maybeSingle();

      const [accessCodesRes, wifiSettingsRes, houseRulesRes, usefulContactsRes, usefulDocumentsRes, messagesRes, reviewsRes] = await Promise.all([
        supabase.from('access_codes').select('*').eq('property_id', reservation.property_id).maybeSingle(),
        supabase.from('wifi_settings').select('*').eq('property_id', reservation.property_id).maybeSingle(),
        supabase.from('house_rules').select('*').eq('property_id', reservation.property_id).order('created_at', { ascending: true }),
        supabase.from('useful_contacts').select('*').eq('property_id', reservation.property_id).order('created_at', { ascending: true }),
        supabase.from('useful_documents').select('*').eq('property_id', reservation.property_id).order('created_at', { ascending: true }),
        supabase.from('messages').select('*').eq('reservation_id', reservation.id).order('created_at', { ascending: true }),
        supabase.from('reviews').select('*').eq('reservation_id', reservation.id).maybeSingle(),
      ]);

      setData({
        reservation,
        client,
        property: property ?? ({} as Property),
        accessCodes: accessCodesRes.data as AccessCode | null,
        wifiSettings: wifiSettingsRes.data as WifiSetting | null,
        houseRules: (houseRulesRes.data as HouseRule[]) ?? [],
        usefulContacts: (usefulContactsRes.data as UsefulContact[]) ?? [],
        usefulDocuments: (usefulDocumentsRes.data as UsefulDocument[]) ?? [],
        messages: (messagesRes.data as Message[]) ?? [],
        review: reviewsRes.data as Review | null,
      });
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingPage />;
  if (invalid || !data) return <InvalidTokenPage />;

  const clientName = getClientName(data.reservation, data.client);
  const property = data.property;
  const unreadAdminCount = data.messages.filter((m) => m.sender === 'admin' && !m.read_at).length;

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'sejour', label: 'Mon s\u00e9jour', icon: Home },
    { key: 'message', label: 'Message', icon: MessageSquare, badge: unreadAdminCount },
    { key: 'avis', label: 'Avis', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center">
            <span className="text-sm font-bold text-amber-600">LB</span>
          </div>
          <p className="text-xs text-stone-400 tracking-wider uppercase">Kotto &bull; Douala</p>
        </div>

        {property?.banner_url ? (
          <div className="w-full h-40 sm:h-52 overflow-hidden">
            <img src={property.banner_url} alt="Banni\u00e8re" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-40 sm:h-52 bg-gradient-to-b from-amber-50 to-white" />
        )}

        <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
          <div className={`bg-white/90 backdrop-blur-sm border border-amber-100 rounded-2xl p-5 shadow-lg transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-serif font-bold text-stone-800">Bonjour, {clientName}</h1>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed">
              {property?.welcome_message || 'Bienvenue dans votre espace client. Retrouvez ici toutes les informations de votre s\u00e9jour.'}
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-1 bg-white border border-amber-100 rounded-xl p-1 shadow-sm">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-amber-100 text-amber-800' : 'text-stone-400 hover:text-stone-600'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
              {badge && badge > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">{badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {activeTab === 'sejour' && <TabSejour data={data} onRulesSigned={() => fetchData()} />}
        {activeTab === 'message' && <TabMessage data={data} />}
        {activeTab === 'avis' && <TabAvis data={data} onReviewSubmitted={() => fetchData()} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-100 bg-white py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs text-stone-400">LB Prestige Appart &bull; Conciergerie d&apos;Exception</p>
          <p className="text-xs text-stone-300 mt-1">Kotto, Carrefour des Roses &bull; Douala</p>
        </div>
      </footer>
    </div>
  );
}
