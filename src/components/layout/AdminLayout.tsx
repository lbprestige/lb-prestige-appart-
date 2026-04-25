import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  CalendarDays,
  Users,
  MessageSquare,
  Send,
  Star,
  Key,
  Wifi,
  FileText,
  CreditCard,
  Bell,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const menuItems = [
  { label: 'Accueil', icon: Home, path: '/admin/accueil' },
  { label: 'Reservations', icon: CalendarDays, path: '/admin/reservations' },
  { label: 'Clients', icon: Users, path: '/admin/clients' },
  { label: 'Messages', icon: MessageSquare, path: '/admin/messages' },
  { label: 'Envois WhatsApp', icon: Send, path: '/admin/whatsapp' },
  { label: 'Avis', icon: Star, path: '/admin/avis' },
  { label: "Codes d'acces", icon: Key, path: '/admin/codes-acces' },
  { label: 'Wi-Fi', icon: Wifi, path: '/admin/wifi' },
  { label: 'Reglement interieur', icon: FileText, path: '/admin/reglement' },
  { label: 'Paiements', icon: CreditCard, path: '/admin/paiements' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Documents', icon: FolderOpen, path: '/admin/documents' },
  { label: 'Configuration', icon: Settings, path: '/admin/configuration' },
];

const pageTitleMap: Record<string, string> = {
  '/admin/accueil': 'Accueil',
  '/admin/reservations': 'Reservations',
  '/admin/clients': 'Clients',
  '/admin/messages': 'Messages',
  '/admin/whatsapp': 'Envois WhatsApp',
  '/admin/avis': 'Avis',
  '/admin/codes-acces': "Codes d'acces",
  '/admin/wifi': 'Wi-Fi',
  '/admin/reglement': 'Reglement interieur',
  '/admin/paiements': 'Paiements',
  '/admin/notifications': 'Notifications',
  '/admin/documents': 'Documents',
  '/admin/configuration': 'Configuration',
};

function formatDateFrench(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPageTitle = pageTitleMap[location.pathname] || 'Accueil';

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'A';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center gap-3 border-b border-amber-900/30 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-500 text-amber-500 font-bold text-lg">
          LB
        </div>
        <div>
          <div className="text-white font-semibold text-lg leading-tight">LB Prestige</div>
          <div className="text-amber-400/70 text-xs">Conciergerie</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t border-amber-900/30 px-3 py-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Deconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gray-950 border-r border-amber-900/30 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-950 border-r border-amber-900/30 transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end px-4 py-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-amber-900/30 bg-gray-900 px-4 py-3 sm:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">{currentPageTitle}</h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-400">Connecte</span>
            </div>
            <span className="hidden text-xs text-gray-500 md:inline">{formatDateFrench()}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-500 text-sm font-semibold text-amber-500">
              {userInitial}
            </div>
            <button
              onClick={handleSignOut}
              className="hidden rounded-md border border-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/10 sm:inline-block"
            >
              Quitter
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
