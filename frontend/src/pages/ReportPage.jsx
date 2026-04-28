"use client"

import React, { useState, useEffect } from "react"
import {
  Download, TrendingUp, Heart, Sparkles, ArrowUpRight
} from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts"
import { apiFetch } from "../api"

const COLORS_MAP = {
  emerald: "oklch(0.55 0.17 160)",
  gold: "oklch(0.78 0.12 85)",
  border: "oklch(0.92 0.005 250)",
  textMuted: "oklch(0.55 0.02 250)",
  pie: ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#8b5cf6"]
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("profit")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/reports/stats")
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => console.error("Error fetching reports:", err))
  }, [])

  // NEW: Download Handler
  const handleDownload = async () => {
    try {
      const res = await apiFetch('/api/reports/download');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartDine_Report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
       <p className="text-slate-500 font-medium animate-pulse">Loading Analytics...</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#fcfcfc] min-h-screen text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive performance insights and trends</p>
        </div>
        {/* UPDATED: Added onClick={handleDownload} */}
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm shadow-sm text-slate-600 hover:bg-[#d9a74a] hover:text-white transition-all"
        >
          <Download className="size-4" /> Download Report
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.summary.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className={`flex size-11 items-center justify-center rounded-xl ${stat.type === 'profit' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {stat.type === 'profit' ? <TrendingUp className="size-5" /> : <Heart className="size-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1 text-emerald-600">
                <ArrowUpRight className="size-3.5" />
                <span className="text-xs font-bold">Good</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{stat.sublabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="w-full">
        <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
          {[
            { id: "profit", label: "Profit Trend", icon: TrendingUp },
            { id: "donations", label: "Donation Impact", icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="size-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Profit Tab Content */}
        {activeTab === "profit" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mt-4">
            <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold mb-6">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.profitTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS_MAP.border} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: COLORS_MAP.textMuted }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS_MAP.textMuted }} />
                  <Tooltip />
                  <Line 
                    type="monotone" dataKey="profit" stroke={COLORS_MAP.gold} strokeWidth={4} 
                    dot={{ fill: COLORS_MAP.gold, r: 6, strokeWidth: 2, stroke: 'white' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold mb-4">Orders by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.categoryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.categoryBreakdown.map((entry, i) => <Cell key={i} fill={COLORS_MAP.pie[i % 5]} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2.5 mt-4">
                {data.categoryBreakdown.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2.5 font-medium text-slate-500">
                      <div className="size-2 rounded-full" style={{ backgroundColor: COLORS_MAP.pie[i % 5] }} />
                      {cat.name}
                    </div>
                    <span className="text-slate-900">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Donations Tab Content */}
        {activeTab === "donations" && (
          <div className="mt-4 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-base font-bold">Meals Donated Over Time</h3>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">
                <Heart className="size-3 fill-current" /> Social Impact
              </span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.donationImpact} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS_MAP.border} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: COLORS_MAP.textMuted }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS_MAP.textMuted }} />
                <Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                <Bar dataKey="meals" fill={COLORS_MAP.emerald} radius={[8, 8, 0, 0]} name="Meals Donated" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}