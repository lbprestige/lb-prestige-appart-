export interface Property {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  address: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  banner_url: string;
  welcome_title: string;
  welcome_message: string;
  arrival_instructions: string;
  netflix_username: string;
  netflix_password: string;
  netflix_instructions: string;
  kitchen_instructions: string;
  parking_instructions: string;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type WhatsAppStatus = 'non_envoye' | 'envoye' | 'erreur';

export interface Reservation {
  id: string;
  client_id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  check_in: string;
  check_out: string;
  suite_type: string;
  guests_count: number;
  status: ReservationStatus;
  client_code: string;
  client_token: string;
  internal_notes: string;
  whatsapp_status: WhatsAppStatus;
  rules_signed: boolean;
  rules_signed_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client | Client[];
  payments?: Payment[];
  reviews?: Review[];
}

export interface AccessCode {
  id: string;
  property_id: string;
  door_code: string;
  safe_code: string;
  created_at: string;
  updated_at: string;
}

export interface WifiSetting {
  id: string;
  property_id: string;
  network_name: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface HouseRule {
  id: string;
  property_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UsefulContact {
  id: string;
  property_id: string;
  label: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UsefulDocument {
  id: string;
  property_id: string;
  title: string;
  file_type: string;
  file_size: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  reservation_id: string;
  client_id: string;
  sender: 'admin' | 'client';
  content: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  reservations?: Reservation;
  clients?: Client;
}

export interface Review {
  id: string;
  reservation_id: string;
  client_id: string;
  rating: number;
  comment: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export type PaymentStatus = 'en_attente' | 'acompte_paye' | 'paye' | 'rembourse';

export interface Payment {
  id: string;
  reservation_id: string;
  status: PaymentStatus;
  amount: number;
  deposit: number;
  balance: number;
  reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'info' | 'arrivee' | 'depart' | 'message' | 'reservation' | 'rappel';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  slug: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type WhatsAppLogStatus = 'pending' | 'sent' | 'error' | 'retry';

export interface WhatsAppLog {
  id: string;
  reservation_id: string | null;
  client_id: string | null;
  template_id: string | null;
  phone: string;
  content: string;
  status: WhatsAppLogStatus;
  wa_me_link: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  reservations?: Reservation;
  clients?: Client;
  whatsapp_templates?: WhatsAppTemplate;
}

export type WhatsAppAutomationEvent = 'reservation_created' | 'check_in_reminder' | 'check_out_reminder' | 'thank_you' | 'review_request' | 'promotion';

export interface WhatsAppAutomation {
  id: string;
  name: string;
  trigger_event: WhatsAppAutomationEvent;
  template_id: string | null;
  active: boolean;
  delay_days: number;
  delay_hours: number;
  created_at: string;
  updated_at: string;
  whatsapp_templates?: WhatsAppTemplate;
}

export type WhatsAppQueueStatus = 'pending' | 'sent' | 'error' | 'retry';

export interface WhatsAppQueueItem {
  id: string;
  reservation_id: string | null;
  client_id: string | null;
  template_id: string | null;
  phone: string;
  content: string;
  status: WhatsAppQueueStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  sent_at: string | null;
  error_message: string;
  created_at: string;
  updated_at: string;
}
