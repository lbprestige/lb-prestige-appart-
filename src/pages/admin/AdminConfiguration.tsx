import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Image,
  MessageSquare,
  Plane,
  Wifi,
  Tv,
  ChefHat,
  Car,
  ScrollText,
  Phone,
  FileText,
  Settings,
  Save,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  Property,
  WhatsAppTemplate,
  WifiSetting,
  HouseRule,
  UsefulContact,
  Setting,
} from '../../types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SectionKey =
  | 'etablissement'
  | 'banniere'
  | 'whatsapp-modeles'
  | 'arrivee'
  | 'wifi'
  | 'netflix'
  | 'cuisine'
  | 'parking'
  | 'reglement'
  | 'contacts'
  | 'documents'
  | 'whatsapp-config';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: 'etablissement', label: 'Etablissement', icon: Building2 },
  { key: 'banniere', label: 'Banniere espace client', icon: Image },
  { key: 'whatsapp-modeles', label: 'Modeles WhatsApp', icon: MessageSquare },
  { key: 'arrivee', label: "Instructions d'arrivee", icon: Plane },
  { key: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { key: 'netflix', label: 'Netflix', icon: Tv },
  { key: 'cuisine', label: 'Cuisine', icon: ChefHat },
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'reglement', label: 'Reglement interieur', icon: ScrollText },
  { key: 'contacts', label: 'Contacts utiles', icon: Phone },
  { key: 'documents', label: 'Documents utiles', icon: FileText },
  { key: 'whatsapp-config', label: 'WhatsApp Configuration', icon: Settings },
];

const WHATSAPP_CONFIG_KEYS = [
  'whatsapp_api_key',
  'whatsapp_phone_number_id',
  'whatsapp_business_account_id',
  'whatsapp_webhook_verify_token',
] as const;

const WHATSAPP_CONFIG_LABELS: Record<string, string> = {
  whatsapp_api_key: 'Cle API WhatsApp',
  whatsapp_phone_number_id: 'ID du numero de telephone',
  whatsapp_business_account_id: 'ID du compte business',
  whatsapp_webhook_verify_token: 'Token de verification Webhook',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminConfiguration() {
  const navigate = useNavigate();

  /* ---- Navigation ---- */
  const [activeSection, setActiveSection] = useState<SectionKey>('etablissement');
  const [, setSidebarOpen] = useState(false);

  /* ---- Toasts ---- */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  function showToast(type: 'success' | 'error', message: string) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  /* ---- Property data ---- */
  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);

  const fetchProperty = useCallback(async () => {
    setLoadingProperty(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      setProperty(data as Property);
    } catch (err) {
      console.error('Erreur chargement propriete:', err);
    } finally {
      setLoadingProperty(false);
    }
  }, []);

  /* ---- WhatsApp templates ---- */
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editTemplates, setEditTemplates] = useState<Record<string, string>>({});
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setTemplates((data as WhatsAppTemplate[]) ?? []);
      const edits: Record<string, string> = {};
      (data as WhatsAppTemplate[])?.forEach((t) => {
        edits[t.id] = t.content;
      });
      setEditTemplates(edits);
    } catch (err) {
      console.error('Erreur chargement modeles WhatsApp:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  /* ---- Wi-Fi settings ---- */
  const [wifiSetting, setWifiSetting] = useState<WifiSetting | null>(null);
  const [loadingWifi, setLoadingWifi] = useState(true);
  const [editWifiNetwork, setEditWifiNetwork] = useState('');
  const [editWifiPassword, setEditWifiPassword] = useState('');

  const fetchWifi = useCallback(async () => {
    setLoadingWifi(true);
    try {
      const { data, error } = await supabase
        .from('wifi_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      setWifiSetting(data as WifiSetting);
      setEditWifiNetwork((data as WifiSetting)?.network_name ?? '');
      setEditWifiPassword((data as WifiSetting)?.password ?? '');
    } catch (err) {
      console.error('Erreur chargement Wi-Fi:', err);
    } finally {
      setLoadingWifi(false);
    }
  }, []);

  /* ---- House rules ---- */
  const [houseRule, setHouseRule] = useState<HouseRule | null>(null);
  const [loadingHouseRules, setLoadingHouseRules] = useState(true);
  const [editHouseRules, setEditHouseRules] = useState('');

  const fetchHouseRules = useCallback(async () => {
    setLoadingHouseRules(true);
    try {
      const { data, error } = await supabase
        .from('house_rules')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      setHouseRule(data as HouseRule);
      setEditHouseRules((data as HouseRule)?.content ?? '');
    } catch (err) {
      console.error('Erreur chargement reglement:', err);
    } finally {
      setLoadingHouseRules(false);
    }
  }, []);

  /* ---- Useful contacts ---- */
  const [contacts, setContacts] = useState<UsefulContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactModal, setContactModal] = useState<null | 'add' | 'edit'>(null);
  const [editContact, setEditContact] = useState<Partial<UsefulContact>>({});
  const [savingContact, setSavingContact] = useState(false);
  const [deleteContactTarget, setDeleteContactTarget] = useState<UsefulContact | null>(null);
  const [deletingContact, setDeletingContact] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('useful_contacts')
        .select('*')
        .order('label', { ascending: true });
      if (error) throw error;
      setContacts((data as UsefulContact[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  /* ---- WhatsApp config (settings key-value) ---- */
  const [waSettings, setWaSettings] = useState<Record<string, string>>({});
  const [loadingWaSettings, setLoadingWaSettings] = useState(true);
  const [editWaSettings, setEditWaSettings] = useState<Record<string, string>>({});
  const [savingWaSetting, setSavingWaSetting] = useState<string | null>(null);

  const fetchWaSettings = useCallback(async () => {
    setLoadingWaSettings(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .in('key', WHATSAPP_CONFIG_KEYS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as Setting[])?.forEach((s) => {
        map[s.key] = s.value;
      });
      setWaSettings(map);
      setEditWaSettings({ ...map });
    } catch (err) {
      console.error('Erreur chargement settings WhatsApp:', err);
    } finally {
      setLoadingWaSettings(false);
    }
  }, []);

  /* ---- Edit states for property fields ---- */
  const [editEtablissement, setEditEtablissement] = useState({
    name: '',
    subtitle: '',
    location: '',
    address: '',
    country: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
  });
  const [savingEtablissement, setSavingEtablissement] = useState(false);

  const [editBanniere, setEditBanniere] = useState({
    banner_url: '',
    welcome_title: '',
    welcome_message: '',
  });
  const [savingBanniere, setSavingBanniere] = useState(false);

  const [editArrivee, setEditArrivee] = useState('');
  const [savingArrivee, setSavingArrivee] = useState(false);

  const [savingWifi, setSavingWifi] = useState(false);

  const [editNetflix, setEditNetflix] = useState({
    netflix_username: '',
    netflix_password: '',
    netflix_instructions: '',
  });
  const [savingNetflix, setSavingNetflix] = useState(false);

  const [editCuisine, setEditCuisine] = useState('');
  const [savingCuisine, setSavingCuisine] = useState(false);

  const [editParking, setEditParking] = useState('');
  const [savingParking, setSavingParking] = useState(false);

  const [savingHouseRules, setSavingHouseRules] = useState(false);

  /* ---- Initialize edit states from fetched property ---- */
  useEffect(() => {
    if (property) {
      setEditEtablissement({
        name: property.name ?? '',
        subtitle: property.subtitle ?? '',
        location: property.location ?? '',
        address: property.address ?? '',
        country: property.country ?? '',
        contact_email: property.contact_email ?? '',
        contact_phone: property.contact_phone ?? '',
        whatsapp_number: property.whatsapp_number ?? '',
      });
      setEditBanniere({
        banner_url: property.banner_url ?? '',
        welcome_title: property.welcome_title ?? '',
        welcome_message: property.welcome_message ?? '',
      });
      setEditArrivee(property.arrival_instructions ?? '');
      setEditNetflix({
        netflix_username: property.netflix_username ?? '',
        netflix_password: property.netflix_password ?? '',
        netflix_instructions: property.netflix_instructions ?? '',
      });
      setEditCuisine(property.kitchen_instructions ?? '');
      setEditParking(property.parking_instructions ?? '');
    }
  }, [property]);

  /* ---- Load all data ---- */
  useEffect(() => {
    fetchProperty();
    fetchTemplates();
    fetchWifi();
    fetchHouseRules();
    fetchContacts();
    fetchWaSettings();
  }, [fetchProperty, fetchTemplates, fetchWifi, fetchHouseRules, fetchContacts, fetchWaSettings]);

  /* ---- Save handlers ---- */

  async function saveEtablissement() {
    if (!property) return;
    setSavingEtablissement(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update(editEtablissement)
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) => (prev ? { ...prev, ...editEtablissement } : prev));
      showToast('success', 'Etablissement mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde etablissement:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingEtablissement(false);
    }
  }

  async function saveBanniere() {
    if (!property) return;
    setSavingBanniere(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update(editBanniere)
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) => (prev ? { ...prev, ...editBanniere } : prev));
      showToast('success', 'Banniere mise a jour');
    } catch (err) {
      console.error('Erreur sauvegarde banniere:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingBanniere(false);
    }
  }

  async function saveTemplate(templateId: string) {
    setSavingTemplateId(templateId);
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ content: editTemplates[templateId] })
        .eq('id', templateId);
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, content: editTemplates[templateId] } : t
        )
      );
      showToast('success', 'Modele mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde modele:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingTemplateId(null);
    }
  }

  async function saveArrivee() {
    if (!property) return;
    setSavingArrivee(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ arrival_instructions: editArrivee })
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) =>
        prev ? { ...prev, arrival_instructions: editArrivee } : prev
      );
      showToast('success', "Instructions d'arrivee mises a jour");
    } catch (err) {
      console.error('Erreur sauvegarde arrivee:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingArrivee(false);
    }
  }

  async function saveWifi() {
    if (!wifiSetting) return;
    setSavingWifi(true);
    try {
      const { error } = await supabase
        .from('wifi_settings')
        .update({ network_name: editWifiNetwork, password: editWifiPassword })
        .eq('id', wifiSetting.id);
      if (error) throw error;
      setWifiSetting((prev) =>
        prev ? { ...prev, network_name: editWifiNetwork, password: editWifiPassword } : prev
      );
      showToast('success', 'Parametres Wi-Fi mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde Wi-Fi:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingWifi(false);
    }
  }

  async function saveNetflix() {
    if (!property) return;
    setSavingNetflix(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update(editNetflix)
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) => (prev ? { ...prev, ...editNetflix } : prev));
      showToast('success', 'Parametres Netflix mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde Netflix:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingNetflix(false);
    }
  }

  async function saveCuisine() {
    if (!property) return;
    setSavingCuisine(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ kitchen_instructions: editCuisine })
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) =>
        prev ? { ...prev, kitchen_instructions: editCuisine } : prev
      );
      showToast('success', 'Instructions cuisine mises a jour');
    } catch (err) {
      console.error('Erreur sauvegarde cuisine:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingCuisine(false);
    }
  }

  async function saveParking() {
    if (!property) return;
    setSavingParking(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ parking_instructions: editParking })
        .eq('id', property.id);
      if (error) throw error;
      setProperty((prev) =>
        prev ? { ...prev, parking_instructions: editParking } : prev
      );
      showToast('success', 'Instructions parking mises a jour');
    } catch (err) {
      console.error('Erreur sauvegarde parking:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingParking(false);
    }
  }

  async function saveHouseRules() {
    if (!houseRule) return;
    setSavingHouseRules(true);
    try {
      const { error } = await supabase
        .from('house_rules')
        .update({ content: editHouseRules })
        .eq('id', houseRule.id);
      if (error) throw error;
      setHouseRule((prev) =>
        prev ? { ...prev, content: editHouseRules } : prev
      );
      showToast('success', 'Reglement interieur mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde reglement:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingHouseRules(false);
    }
  }

  /* ---- Contact CRUD ---- */

  async function saveContact() {
    setSavingContact(true);
    try {
      if (contactModal === 'add') {
        const propertyId = property?.id ?? contacts[0]?.property_id ?? '';
        const { error } = await supabase
          .from('useful_contacts')
          .insert({
            property_id: propertyId,
            label: editContact.label?.trim() ?? '',
            phone: editContact.phone?.trim() ?? '',
            email: editContact.email?.trim() ?? '',
          });
        if (error) throw error;
        showToast('success', 'Contact ajoute');
      } else if (contactModal === 'edit' && editContact.id) {
        const { error } = await supabase
          .from('useful_contacts')
          .update({
            label: editContact.label?.trim() ?? '',
            phone: editContact.phone?.trim() ?? '',
            email: editContact.email?.trim() ?? '',
          })
          .eq('id', editContact.id);
        if (error) throw error;
        showToast('success', 'Contact mis a jour');
      }
      setContactModal(null);
      setEditContact({});
      fetchContacts();
    } catch (err) {
      console.error('Erreur sauvegarde contact:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingContact(false);
    }
  }

  async function confirmDeleteContact() {
    if (!deleteContactTarget) return;
    setDeletingContact(true);
    try {
      const { error } = await supabase
        .from('useful_contacts')
        .delete()
        .eq('id', deleteContactTarget.id);
      if (error) throw error;
      showToast('success', 'Contact supprime');
      setDeleteContactTarget(null);
      fetchContacts();
    } catch (err) {
      console.error('Erreur suppression contact:', err);
      showToast('error', 'Erreur lors de la suppression');
    } finally {
      setDeletingContact(false);
    }
  }

  /* ---- WhatsApp config save ---- */

  async function saveWaSetting(key: string) {
    setSavingWaSetting(key);
    try {
      const existingRow = Object.entries(waSettings).find(([k]) => k === key);
      if (existingRow) {
        const { error } = await supabase
          .from('settings')
          .update({ value: editWaSettings[key] ?? '' })
          .eq('key', key)
          .select('id')
          .single();
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert({
          key,
          value: editWaSettings[key] ?? '',
        });
        if (error) throw error;
      }
      setWaSettings((prev) => ({ ...prev, [key]: editWaSettings[key] ?? '' }));
      showToast('success', 'Parametre mis a jour');
    } catch (err) {
      console.error('Erreur sauvegarde setting:', err);
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingWaSetting(null);
    }
  }

  /* ---- Section click (mobile) ---- */
  function handleSectionClick(key: SectionKey) {
    if (key === 'documents') {
      navigate('/admin/documents');
      return;
    }
    setActiveSection(key);
    setSidebarOpen(false);
  }

  /* ---- Save button component ---- */
  function SaveButton({
    onSave,
    saving,
    label = 'Enregistrer',
  }: {
    onSave: () => void;
    saving: boolean;
    label?: string;
  }) {
    return (
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allow"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {label}
      </button>
    );
  }

  /* ---- Input component ---- */
  function FieldInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          placeholder={placeholder}
        />
      </div>
    );
  }

  function FieldTextarea({
    label,
    value,
    onChange,
    rows = 6,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-y"
          placeholder={placeholder}
        />
      </div>
    );
  }

  /* ---- Section content renderers ---- */

  function renderSectionHeader(icon: React.ElementType, title: string, subtitle: string) {
    const Icon = icon;
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
      </div>
    );
  }

  /* ---- Loading spinner ---- */
  function SectionLoading() {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
      </div>
    );
  }

  /* ---- Section: Etablissement ---- */
  function renderEtablissement() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Building2, 'Etablissement', 'Informations generales de la propriete')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <FieldInput label="Nom" value={editEtablissement.name} onChange={(v) => setEditEtablissement((p) => ({ ...p, name: v }))} placeholder="Nom de l'etablissement" />
          <FieldInput label="Sous-titre" value={editEtablissement.subtitle} onChange={(v) => setEditEtablissement((p) => ({ ...p, subtitle: v }))} placeholder="Sous-titre" />
          <FieldInput label="Localisation" value={editEtablissement.location} onChange={(v) => setEditEtablissement((p) => ({ ...p, location: v }))} placeholder="Ville, region" />
          <FieldInput label="Adresse" value={editEtablissement.address} onChange={(v) => setEditEtablissement((p) => ({ ...p, address: v }))} placeholder="Adresse complete" />
          <FieldInput label="Pays" value={editEtablissement.country} onChange={(v) => setEditEtablissement((p) => ({ ...p, country: v }))} placeholder="Pays" />
          <FieldInput label="Email de contact" value={editEtablissement.contact_email} onChange={(v) => setEditEtablissement((p) => ({ ...p, contact_email: v }))} type="email" placeholder="contact@exemple.com" />
          <FieldInput label="Telephone de contact" value={editEtablissement.contact_phone} onChange={(v) => setEditEtablissement((p) => ({ ...p, contact_phone: v }))} type="tel" placeholder="+33 1 23 45 67 89" />
          <FieldInput label="Numero WhatsApp" value={editEtablissement.whatsapp_number} onChange={(v) => setEditEtablissement((p) => ({ ...p, whatsapp_number: v }))} type="tel" placeholder="+33 6 12 34 56 78" />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveEtablissement} saving={savingEtablissement} />
        </div>
      </div>
    );
  }

  /* ---- Section: Banniere ---- */
  function renderBanniere() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Image, 'Banniere espace client', 'Personnalisez la banniere de l\'espace client')}
        <div className="space-y-5 mb-6">
          <FieldInput label="URL de la banniere" value={editBanniere.banner_url} onChange={(v) => setEditBanniere((p) => ({ ...p, banner_url: v }))} placeholder="https://exemple.com/banniere.jpg" />
          {editBanniere.banner_url && (
            <div className="rounded-xl overflow-hidden border border-gray-700 max-h-48">
              <img
                src={editBanniere.banner_url}
                alt="Apercu banniere"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <FieldInput label="Titre de bienvenue" value={editBanniere.welcome_title} onChange={(v) => setEditBanniere((p) => ({ ...p, welcome_title: v }))} placeholder="Bienvenue !" />
          <FieldTextarea label="Message de bienvenue" value={editBanniere.welcome_message} onChange={(v) => setEditBanniere((p) => ({ ...p, welcome_message: v }))} rows={4} placeholder="Nous sommes ravis de vous accueillir..." />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveBanniere} saving={savingBanniere} />
        </div>
      </div>
    );
  }

  /* ---- Section: Modeles WhatsApp ---- */
  function renderWhatsappModeles() {
    if (loadingTemplates) return <SectionLoading />;
    return (
      <div className="space-y-4">
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          {renderSectionHeader(MessageSquare, 'Modeles WhatsApp', 'Editez les modeles de messages WhatsApp')}
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-900/20 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-200 text-sm">
              Variables disponibles : <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">{'{prenom}'}</code>, <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">{'{lien}'}</code>, <code className="text-amber-400/80 bg-gray-800 px-1.5 py-0.5 rounded">{'{code}'}</code>
            </p>
          </div>
        </div>
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-gray-900 border border-amber-900/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">{template.name}</h3>
              <span className="text-gray-500 text-xs font-mono">{template.slug}</span>
            </div>
            <textarea
              value={editTemplates[template.id] ?? template.content}
              onChange={(e) =>
                setEditTemplates((prev) => ({ ...prev, [template.id]: e.target.value }))
              }
              rows={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-y mb-4"
            />
            <div className="flex justify-end">
              <SaveButton
                onSave={() => saveTemplate(template.id)}
                saving={savingTemplateId === template.id}
              />
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun modele WhatsApp configure</p>
          </div>
        )}
      </div>
    );
  }

  /* ---- Section: Instructions d'arrivee ---- */
  function renderArrivee() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Plane, "Instructions d'arrivee", 'Informations transmises aux clients a leur arrivee')}
        <div className="mb-6">
          <FieldTextarea
            label="Instructions d'arrivee"
            value={editArrivee}
            onChange={setEditArrivee}
            rows={10}
            placeholder="Decrivez les instructions d'arrivee pour vos clients..."
          />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveArrivee} saving={savingArrivee} />
        </div>
      </div>
    );
  }

  /* ---- Section: Wi-Fi ---- */
  function renderWifi() {
    if (loadingWifi) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Wifi, 'Wi-Fi', 'Parametres de connexion Wi-Fi de la propriete')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nom du reseau (SSID)</label>
            <input
              type="text"
              value={editWifiNetwork}
              onChange={(e) => setEditWifiNetwork(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="Nom du reseau"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Mot de passe Wi-Fi</label>
            <input
              type="text"
              value={editWifiPassword}
              onChange={(e) => setEditWifiPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-amber-400 text-xl font-mono text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="Mot de passe"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveWifi} saving={savingWifi} />
        </div>
      </div>
    );
  }

  /* ---- Section: Netflix ---- */
  function renderNetflix() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Tv, 'Netflix', 'Identifiants et instructions Netflix')}
        <div className="space-y-5 mb-6">
          <FieldInput label="Nom d'utilisateur Netflix" value={editNetflix.netflix_username} onChange={(v) => setEditNetflix((p) => ({ ...p, netflix_username: v }))} placeholder="email@netflix.com" />
          <FieldInput label="Mot de passe Netflix" value={editNetflix.netflix_password} onChange={(v) => setEditNetflix((p) => ({ ...p, netflix_password: v }))} type="password" placeholder="Mot de passe" />
          <FieldTextarea label="Instructions Netflix" value={editNetflix.netflix_instructions} onChange={(v) => setEditNetflix((p) => ({ ...p, netflix_instructions: v }))} rows={4} placeholder="Instructions pour utiliser Netflix..." />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveNetflix} saving={savingNetflix} />
        </div>
      </div>
    );
  }

  /* ---- Section: Cuisine ---- */
  function renderCuisine() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(ChefHat, 'Cuisine', 'Instructions relatives a la cuisine')}
        <div className="mb-6">
          <FieldTextarea
            label="Instructions cuisine"
            value={editCuisine}
            onChange={setEditCuisine}
            rows={8}
            placeholder="Decrivez les instructions pour la cuisine..."
          />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveCuisine} saving={savingCuisine} />
        </div>
      </div>
    );
  }

  /* ---- Section: Parking ---- */
  function renderParking() {
    if (loadingProperty) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(Car, 'Parking', 'Instructions relatives au parking')}
        <div className="mb-6">
          <FieldTextarea
            label="Instructions parking"
            value={editParking}
            onChange={setEditParking}
            rows={8}
            placeholder="Decrivez les instructions pour le parking..."
          />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveParking} saving={savingParking} />
        </div>
      </div>
    );
  }

  /* ---- Section: Reglement interieur ---- */
  function renderReglement() {
    if (loadingHouseRules) return <SectionLoading />;
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(ScrollText, 'Reglement interieur', 'Regles et consignes pour les clients')}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-900/20 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-200 text-sm">
            Ce texte est egalement visible dans l'espace client
          </p>
        </div>
        <div className="mb-6">
          <FieldTextarea
            label="Reglement interieur"
            value={editHouseRules}
            onChange={setEditHouseRules}
            rows={16}
            placeholder="Saisissez les regles de la maison..."
          />
        </div>
        <div className="flex justify-end">
          <SaveButton onSave={saveHouseRules} saving={savingHouseRules} />
        </div>
      </div>
    );
  }

  /* ---- Section: Contacts utiles ---- */
  function renderContacts() {
    if (loadingContacts) return <SectionLoading />;
    return (
      <div className="space-y-4">
        <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            {renderSectionHeader(Phone, 'Contacts utiles', 'Gerez les contacts utiles pour vos clients')}
            <button
              onClick={() => {
                setEditContact({ label: '', phone: '', email: '' });
                setContactModal('add');
              }}
              className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-12 text-center">
            <Phone className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun contact utile configure</p>
            <p className="text-gray-600 text-sm mt-1">Cliquez sur "Ajouter" pour commencer</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-amber-900/20 rounded-2xl overflow-hidden divide-y divide-gray-800">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{contact.label}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {contact.phone && (
                      <span className="text-gray-400 text-xs">{contact.phone}</span>
                    )}
                    {contact.email && (
                      <span className="text-gray-400 text-xs">{contact.email}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditContact({
                        id: contact.id,
                        label: contact.label,
                        phone: contact.phone,
                        email: contact.email,
                      });
                      setContactModal('edit');
                    }}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteContactTarget(contact)}
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
    );
  }

  /* ---- Section: Documents utiles ---- */
  function renderDocuments() {
    return (
      <div className="bg-gray-900 border border-amber-900/20 rounded-2xl p-8">
        {renderSectionHeader(FileText, 'Documents utiles', 'Gerez les documents disponibles pour les clients')}
        <div className="flex items-center justify-center py-8">
          <button
            onClick={() => navigate('/admin/documents')}
            className="inline-flex items-center gap-3 bg-amber-500 text-gray-950 font-semibold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Gerer les documents
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ---- Section: WhatsApp Configuration ---- */
  function renderWhatsappConfig() {
    if (loadingWaSettings) return <SectionLoading />;
    return (
      <div className="space-y-4">
        {WHATSAPP_CONFIG_KEYS.map((key) => (
          <div
            key={key}
            className="bg-gray-900 border border-amber-900/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <KeyRound className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-medium">{WHATSAPP_CONFIG_LABELS[key]}</h3>
                <p className="text-gray-500 text-xs font-mono">{key}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type={key.includes('key') || key.includes('token') ? 'password' : 'text'}
                value={editWaSettings[key] ?? ''}
                onChange={(e) =>
                  setEditWaSettings((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                placeholder={WHATSAPP_CONFIG_LABELS[key]}
              />
              <SaveButton
                onSave={() => saveWaSetting(key)}
                saving={savingWaSetting === key}
                label="Sauvegarder"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Section renderer ---- */
  function renderActiveSection() {
    switch (activeSection) {
      case 'etablissement':
        return renderEtablissement();
      case 'banniere':
        return renderBanniere();
      case 'whatsapp-modeles':
        return renderWhatsappModeles();
      case 'arrivee':
        return renderArrivee();
      case 'wifi':
        return renderWifi();
      case 'netflix':
        return renderNetflix();
      case 'cuisine':
        return renderCuisine();
      case 'parking':
        return renderParking();
      case 'reglement':
        return renderReglement();
      case 'contacts':
        return renderContacts();
      case 'documents':
        return renderDocuments();
      case 'whatsapp-config':
        return renderWhatsappConfig();
      default:
        return null;
    }
  }

  /* ---- Main render ---- */
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configuration</h1>
        <p className="text-gray-400 text-sm mt-1">
          Parametres de votre etablissement et de l'espace client
        </p>
      </div>

      {/* Mobile section tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 overflow-x-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => handleSectionClick(section.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-gray-950'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content: sidebar + section */}
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="bg-gray-900 border border-amber-900/20 rounded-2xl p-2 sticky top-6">
            <ul className="space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                return (
                  <li key={section.key}>
                    <button
                      onClick={() => handleSectionClick(section.key)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-900/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {section.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Section content */}
        <main className="flex-1 min-w-0">
          {renderActiveSection()}
        </main>
      </div>

      {/* Contact add/edit modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {contactModal === 'add' ? 'Ajouter un contact' : 'Modifier le contact'}
              </h2>
              <button
                onClick={() => {
                  setContactModal(null);
                  setEditContact({});
                }}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Label</label>
                <input
                  type="text"
                  value={editContact.label ?? ''}
                  onChange={(e) => setEditContact((p) => ({ ...p, label: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Ex: Urgence plomberie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Telephone</label>
                <input
                  type="tel"
                  value={editContact.phone ?? ''}
                  onChange={(e) => setEditContact((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editContact.email ?? ''}
                  onChange={(e) => setEditContact((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="contact@exemple.com"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setContactModal(null);
                    setEditContact({});
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={saveContact}
                  disabled={savingContact}
                  className="inline-flex items-center gap-2 bg-amber-500 text-gray-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                  {contactModal === 'add' ? 'Ajouter' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact delete confirmation */}
      {deleteContactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-amber-900/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Supprimer le contact</h3>
                <p className="text-gray-400 text-sm mt-0.5">Cette action est irreversible.</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Voulez-vous vraiment supprimer le contact{' '}
              <span className="text-white font-medium">{deleteContactTarget.label}</span> ?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteContactTarget(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteContact}
                disabled={deletingContact}
                className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-right ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-700/50 text-green-200'
                : 'bg-red-900/90 border-red-700/50 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
