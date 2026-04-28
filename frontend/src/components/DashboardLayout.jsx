"use client"

import React, { useState, useEffect } from "react"; 
import { 
  ChefHat, LayoutDashboard, UtensilsCrossed, Package, Receipt, 
  Brain, TrendingUp, Lightbulb, AlertTriangle, BarChart3, 
  Bell, ChevronDown, X, CheckCircle2,
  User, Settings, LogOut 
} from "lucide-react";
import { apiFetch } from "../api";

const navItems = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Menu & Recipes", icon: UtensilsCrossed },
    { label: "Inventory", icon: Package },
    { label: "Billing & Sales", icon: Receipt },
  ],
  ai: [
    { label: "AI Forecasting", icon: Brain },
    { label: "Profit & Loss", icon: TrendingUp },
    { label: "Recommendations", icon: Lightbulb },
    { label: "Low Stock Alerts", icon: AlertTriangle },
  ],
  social: [
    { label: "Reports", icon: BarChart3 },
  ]
};

export default function DashboardLayout({ children, activePage, setActivePage, onLogout }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "Loading...",
    restaurant: "SmartDine",
    location: "Mumbai, India",
    image: null
  });

  const fetchNotifications = () => {
    apiFetch("/api/notifications")
      .then(res => res.json())
      .then(data => setNotificationList(data))
      .catch(err => console.error("Notification Error:", err));
  };

  const handleDismiss = (id) => {
    apiFetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    .then(() => {
      // Optimistically update UI
      setNotificationList(prev => prev.filter(n => n.id !== id));
    })
    .catch(err => console.error("Dismiss Error:", err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiFetch("/api/profile/")
      .then(res => res.json())
      .then(data => { if (data) setProfile(data); })
      .catch(err => console.error("Error fetching sidebar profile:", err));
  }, [activePage]);

  const handleLogout = () => { if (onLogout) onLogout(); };

  const getInitials = (name) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "SD";
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="relative w-80 bg-white h-full shadow-2xl p-6 animate-in slide-in-from-right flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                Notifications {notificationList.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{notificationList.length}</span>}
              </h3>
              <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {notificationList.map((n) => (
                <div key={n.id} className="group relative p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all">
                  <button 
                    onClick={() => handleDismiss(n.id)}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <div className="flex gap-3">
                    <div className={`mt-1 ${n.type === 'alert' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {n.type === 'alert' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 pr-4">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.desc}</p>
                      <button 
                        onClick={() => { setActivePage(n.targetPage); setShowNotifications(false); }}
                        className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-wider hover:underline"
                      >
                        View {n.targetPage}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {notificationList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <Bell className="text-slate-300" size={32} />
                  </div>
                  <p className="text-sm font-medium text-slate-500">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No new alerts at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-emerald-500 p-1.5 rounded-lg"><ChefHat className="size-6 text-white" /></div>
          <h1 className="text-sm font-bold text-white leading-none">SmartDine</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Operations</p>
            {navItems.main.map((item) => (
              <button key={item.label} onClick={() => setActivePage(item.label)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${activePage === item.label ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Analytics</p>
            {navItems.ai.map((item) => (
              <button key={item.label} onClick={() => setActivePage(item.label)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${activePage === item.label ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><item.icon size={18} /> {item.label}</div>
              </button>
            ))}
            {navItems.social.map((item) => (
              <button key={item.label} onClick={() => setActivePage(item.label)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mt-1 transition-colors ${activePage === item.label ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 relative">
          {showUserDropdown && (
            <div className="absolute bottom-20 left-4 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-30">
              <button onClick={() => { setActivePage("Profile"); setShowUserDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <User size={16} className="text-slate-400" /> Profile
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}

          <div 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center gap-3 p-2 cursor-pointer rounded-xl transition-all ${showUserDropdown ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
          >
            <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {getInitials(profile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile.restaurant}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96"></div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              {notificationList.length > 0 && (
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{profile.restaurant}</p>
              <p className="text-[10px] text-slate-500 uppercase">{profile.location}</p>
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}