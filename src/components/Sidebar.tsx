import React from 'react';
import { FileText, Search, Image as ImageIcon, ScanText, LogOut, Clock, Settings as SettingsIcon, Shield, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userPhoto: string | null;
  userName: string | null;
  isAdmin?: boolean;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, userPhoto, userName, isAdmin }: SidebarProps) {
  const navItems = [
    { id: 'certificate', label: 'Certificats', icon: FileText },
    { id: 'history', label: 'Historique', icon: Clock },
    { id: 'updates', label: 'Mise à jour', icon: Rocket },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
    ...(isAdmin ? [{ id: 'admin', label: 'Administration', icon: Shield }] : []),
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">MediDesk Pro</h1>
          <p className="text-xs text-gray-500 mt-1">Cabinet Médical</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-gray-900 text-white shadow-md shadow-gray-900/10" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            {userPhoto ? (
              <img src={userPhoto} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">{userName?.charAt(0) || 'U'}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Utilisateur'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-semibold">M</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">MediDesk Pro</h1>
        </div>
        <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                isActive ? "bg-gray-100" : "bg-transparent"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
