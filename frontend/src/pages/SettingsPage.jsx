"use client"

import React, { useState } from "react"
import { Bell, Package, Brain, Heart, ShieldCheck, Save, Mail } from "lucide-react"

export default function SettingsPage() {
  // Notification States
  const [lowStockNotif, setLowStockNotif] = useState(true)
  const [donationNotif, setDonationNotif] = useState(true)
  const [aiNotif, setAiNotif] = useState(true)
  const [dailySummary, setDailySummary] = useState(false)

  // Threshold States
  const [stockThreshold, setStockThreshold] = useState(35)
  const [safetyWindow, setSafetyWindow] = useState(4)
  const [wasteTarget, setWasteTarget] = useState(15)

  const handleSave = () => {
    alert("Settings saved successfully!")
  }

  // Helper function to calculate slider fill color
  const getBackgroundSize = (value, min, max) => {
    return { backgroundSize: `${(value - min) * 100 / (max - min)}% 100%` };
  };

  const Toggle = ({ enabled, setEnabled }) => (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`${
        enabled ? "bg-emerald-500" : "bg-slate-200"
      } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
    >
      <span
        className={`${
          enabled ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure notifications, thresholds, and preferences</p>
        </div>
        <button 
          onClick={handleSave} 
          className="flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm font-semibold"
        >
          <Save className="size-4 mr-2" /> Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Notification Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="size-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900">Notification Preferences</h3>
            </div>
            <p className="text-xs text-slate-500">Choose which notifications you want to receive</p>
          </div>
          
          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-50">
                  <Package className="size-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Low Stock Alerts</p>
                  <p className="text-xs text-slate-500">Get notified when ingredients are low</p>
                </div>
              </div>
              <Toggle enabled={lowStockNotif} setEnabled={setLowStockNotif} />
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Heart className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Donation Updates</p>
                  <p className="text-xs text-slate-500">Pickup confirmations and impact reports</p>
                </div>
              </div>
              <Toggle enabled={donationNotif} setEnabled={setDonationNotif} />
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                  <Brain className="size-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">AI Recommendations</p>
                  <p className="text-xs text-slate-500">Smart insights and preparation tips</p>
                </div>
              </div>
              <Toggle enabled={aiNotif} setEnabled={setAiNotif} />
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50">
                  <Mail className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Daily Summary Email</p>
                  <p className="text-xs text-slate-500">Receive a daily digest at 9 PM</p>
                </div>
              </div>
              <Toggle enabled={dailySummary} setEnabled={setDailySummary} />
            </div>
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="size-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900">Threshold Settings</h3>
            </div>
            <p className="text-xs text-slate-500">Configure alert thresholds and targets</p>
          </div>

          <div className="p-6 flex flex-col gap-8">
            {/* Stock Slider */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Low Stock Alert Threshold</label>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{stockThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                style={getBackgroundSize(stockThreshold, 0, 100)}
                className="custom-slider w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 italic">Alert when stock falls below {stockThreshold}% of max capacity</p>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Safety Window Slider */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Food Safety Window</label>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{safetyWindow} hours</span>
              </div>
              <input 
                type="range" 
                min="1" max="8" step="0.5"
                value={safetyWindow}
                onChange={(e) => setSafetyWindow(Number(e.target.value))}
                style={getBackgroundSize(safetyWindow, 1, 8)}
                className="custom-slider w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 italic">Maximum time before leftover food is considered unsafe for donation</p>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Waste Target Slider */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Weekly Waste Target</label>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{wasteTarget} kg</span>
              </div>
              <input 
                type="range" 
                min="5" max="50" step="1"
                value={wasteTarget}
                onChange={(e) => setWasteTarget(Number(e.target.value))}
                style={getBackgroundSize(wasteTarget, 5, 50)}
                className="custom-slider w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 italic">AI will optimize prep quantities to stay under {wasteTarget} kg/week</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Styles for the colored track fill */}
      <style jsx>{`
        .custom-slider {
          background-image: linear-gradient(#10b981, #10b981);
          background-repeat: no-repeat;
        }
        .custom-slider::-webkit-slider-thumb {
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #10b981;
          cursor: pointer;
          box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}