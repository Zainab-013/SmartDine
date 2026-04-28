"use client"

import React, { useState, useEffect } from "react"; 
import { LayoutDashboard } from "lucide-react";
import AuthPages from "./pages/auth/AuthPages";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import MenuPage from "./pages/MenuPage"; 
import InventoryPage from "./pages/InventoryPage";
import BillingPage from "./pages/BillingPage";
import ForecastingPage from "./pages/forecasting"; 
import ProfitLossPage from "./pages/ProfitLossPage"; 
import RecommendationsPage from "./pages/RecommendationPage"; 
import AlertPage from "./pages/AlertPage"; 
import DonationPage from "./pages/DonationPage"; 
import ReportPage from "./pages/ReportPage";
import ProfilePage from "./pages/ProfilePage"; 
import SettingsPage from "./pages/SettingsPage";
import { apiFetch } from "./api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");

  useEffect(() => {
    // Check if there's a valid token on mount
    const token = localStorage.getItem("token");
    if (token) {
      // Validate token by calling /api/auth/me
      apiFetch("/api/auth/me")
        .then((res) => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            // Token is invalid/expired — clear it
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  // Listen for auth:logout events from apiFetch (session expired)
  useEffect(() => {
    const handleForceLogout = () => {
      setIsAuthenticated(false);
      setActivePage("Dashboard");
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const handleLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("isLoggedIn", "true");
    setIsAuthenticated(true);
    setActivePage("Dashboard"); 
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPages onLogin={handleLogin} />;
  }
  
  const implementedPages = [
    "Dashboard", "Menu & Recipes", "Inventory", "Low Stock Alerts", 
    "Billing & Sales", "AI Forecasting", "Profit & Loss",
    "Recommendations", "Food Donation", "Reports", "Profile", "Settings"
  ];

  return (
    <DashboardLayout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      onLogout={handleLogout}
    >
      {activePage === "Dashboard" && <Dashboard />}
      {activePage === "Menu & Recipes" && <MenuPage setActivePage={setActivePage} />}
      {activePage === "Inventory" && <InventoryPage />}
      {activePage === "AI Forecasting" && <ForecastingPage />}
      {activePage === "Billing & Sales" && <BillingPage />}
      {activePage === "Low Stock Alerts" && <AlertPage />}
      {activePage === "Profit & Loss" && <ProfitLossPage />}
      {activePage === "Recommendations" && <RecommendationsPage />}
      {activePage === "Food Donation" && <DonationPage />}
      {activePage === "Reports" && <ReportPage />}
      {activePage === "Profile" && <ProfilePage />}
      {activePage === "Settings" && <SettingsPage />}

      {!implementedPages.includes(activePage) && (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
             <LayoutDashboard size={40} className="text-slate-200" />
          </div>
          <p className="font-medium">The {activePage} module is being calibrated.</p>
          <p className="text-xs mt-1">AI processing in progress...</p>
        </div>
      )}
    </DashboardLayout>
  );
}