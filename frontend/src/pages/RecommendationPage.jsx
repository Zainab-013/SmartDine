"use client"

import React, { useState, useEffect } from "react"
import {
  Lightbulb, TrendingDown, TrendingUp, DollarSign, Sparkles,
  Package, ShoppingCart, Heart, AlertTriangle, Check, X,
  ChevronDown, ChevronUp, Brain, BarChart3, BookOpen, RefreshCw, Loader2,
  StickyNote, Undo2, Trash2,
} from "lucide-react"
import { apiFetch, API_BASE } from "../api"

// --- STYLES & CONFIG ---
const priorityColors = {
  high: "bg-red-50 text-red-600 border-red-100",
  medium: "bg-amber-50 text-amber-600 border-amber-100",
  low: "bg-emerald-50 text-emerald-600 border-emerald-100",
}

const categoryColors = {
  Preparation: "bg-emerald-100 text-emerald-700",
  Pricing: "bg-amber-100 text-amber-700",
  Inventory: "bg-blue-100 text-blue-700",
  "Menu Strategy": "bg-slate-100 text-slate-700",
  "AI Forecast": "bg-purple-100 text-purple-700",
  Sustainability: "bg-emerald-100 text-emerald-700",
  "Supply Chain": "bg-red-100 text-red-700",
}

const dataSourceConfig = {
  rule_based: {
    label: "Rule-Based",
    icon: BookOpen,
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  statistical: {
    label: "Statistical",
    icon: BarChart3,
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  ml_forecast: {
    label: "ML Forecast",
    icon: Brain,
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    dot: "bg-fuchsia-500",
  },
}

// Map type/category to an icon
function getIcon(rec) {
  const type = rec.type || ""
  const cat = (rec.category || "").toLowerCase()
  if (type === "inventory" || cat === "inventory") return Package
  if (type === "preparation" || cat === "preparation") return TrendingDown
  if (type === "menu_strategy" || cat.includes("menu")) return TrendingUp
  if (cat.includes("forecast") || cat.includes("ai")) return Brain
  if (type === "pricing") return DollarSign
  return Lightbulb
}



// Helper: get dismissed map from localStorage, auto-clean expired (>24hr)
function getDismissed() {
  try {
    const raw = JSON.parse(localStorage.getItem("smartdine_dismissed") || "{}")
    const now = Date.now()
    const valid = {}
    for (const [key, ts] of Object.entries(raw)) {
      if (now - ts < 24 * 60 * 60 * 1000) valid[key] = ts // keep if <24hr
    }
    // Clean up expired entries
    if (Object.keys(valid).length !== Object.keys(raw).length) {
      localStorage.setItem("smartdine_dismissed", JSON.stringify(valid))
    }
    return valid
  } catch { return {} }
}

function saveDismissed(map) {
  localStorage.setItem("smartdine_dismissed", JSON.stringify(map))
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null) // null = show all
  const [notes, setNotes] = useState([]) // saved/applied recommendations

  const fetchRecommendations = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const res = await apiFetch(`/api/recommendations`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      const dismissed = getDismissed()
      const filtered = (data.recommendations || []).filter(r => !dismissed[r.title])
      setRecommendations(filtered)
    } catch (err) {
      console.error("Failed to fetch recommendations:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  // OK → move recommendation to notes panel
  const handleApply = (id) => {
    const rec = recommendations.find(r => r.id === id)
    if (rec) {
      setNotes(prev => [{ ...rec, savedAt: new Date().toLocaleTimeString() }, ...prev])
      setRecommendations(prev => prev.filter(r => r.id !== id))
    }
  }

  // Undo → move note back to recommendations
  const handleUndo = (id) => {
    const note = notes.find(n => n.id === id)
    if (note) {
      const { savedAt, ...rec } = note
      setRecommendations(prev => [...prev, rec])
      setNotes(prev => prev.filter(n => n.id !== id))
    }
  }

  // Remove from notes permanently
  const handleRemoveNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleDismiss = (id) => {
    const rec = recommendations.find(r => r.id === id)
    if (rec) {
      // Save to localStorage with current timestamp — hidden for 24hrs
      const dismissed = getDismissed()
      dismissed[rec.title] = Date.now()
      saveDismissed(dismissed)
    }
    setRecommendations(prev => prev.filter(r => r.id !== id))
  }

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="p-6 max-w-full mx-auto flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-50 animate-pulse">
          <Loader2 className="size-8 text-amber-500 animate-spin" />
        </div>
        <p className="text-sm text-slate-500 font-medium">Generating AI recommendations…</p>
      </div>
    )
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="p-6 max-w-full mx-auto flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="size-8 text-red-500" />
        </div>
        <p className="text-sm text-red-600 font-medium">Failed to load recommendations</p>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={() => fetchRecommendations()}
          className="mt-2 flex items-center gap-1.5 px-4 h-8 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="size-3" /> Retry
        </button>
      </div>
    )
  }

  // Count by data source
  const sourceCounts = recommendations.reduce((acc, r) => {
    const src = r.data_source || "rule_based"
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})

  // Filter recommendations based on active filter
  const filtered = activeFilter
    ? recommendations.filter(r => (r.data_source || "rule_based") === activeFilter)
    : recommendations

  return (
    <div className="p-6 max-w-full mx-auto flex flex-col gap-6 animate-in fade-in duration-500">

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart AI Recommendations</h1>
          <p className="text-sm text-slate-500 mt-1">Actionable insights to optimize your operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 h-8 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 bg-amber-50 text-xs font-medium w-fit">
            <Sparkles className="size-3" />
            {filtered.length}{activeFilter ? ` of ${recommendations.length}` : ""} Active Recommendations
          </div>
        </div>
      </div>

      {/* DATA SOURCE FILTER BUTTONS */}
      {recommendations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* All button */}
          <button
            onClick={() => setActiveFilter(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 ${
              activeFilter === null
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
            <span className="ml-0.5 opacity-70">({recommendations.length})</span>
          </button>

          {Object.entries(dataSourceConfig).map(([key, cfg]) => {
            const count = sourceCounts[key] || 0
            if (count === 0) return null
            const Icon = cfg.icon
            const isActive = activeFilter === key
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(isActive ? null : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-${cfg.dot.replace('bg-', '')}/40 shadow-sm`
                    : `bg-white ${cfg.text} ${cfg.border} hover:${cfg.bg}`
                }`}
              >
                <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                <Icon className="size-3" />
                {cfg.label}
                <span className="ml-0.5 opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ═══ MAIN SPLIT LAYOUT: Recommendations (left) + Notes (right) ═══ */}
      <div className="flex gap-6 items-start">

        {/* ──── LEFT: RECOMMENDATIONS ──── */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <Check className="size-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{activeFilter ? "No matches" : "All caught up!"}</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md">
                {activeFilter
                  ? `No recommendations from the ${dataSourceConfig[activeFilter]?.label} engine. Try another filter.`
                  : "New insights will appear as AI analyzes more data."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((rec) => {
                const isExpanded = expandedId === rec.id
                const Icon = getIcon(rec)
                const srcCfg = dataSourceConfig[rec.data_source] || dataSourceConfig.rule_based
                const SrcIcon = srcCfg.icon
                const confidence = rec.confidence || 0

                return (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Title + Priority */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-[13px] text-slate-900 leading-snug">{rec.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0 ${priorityColors[rec.priority]}`}>
                          {rec.priority}
                        </span>
                      </div>

                      {/* Reason */}
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">{rec.reason}</p>

                      {/* Details Area */}
                      {isExpanded && (
                        <div className="mb-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <span className="text-slate-900 font-bold block mb-1">Detailed Analysis:</span>
                            {rec.details}
                          </p>
                        </div>
                      )}

                      {/* Badges: category + source + confidence */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${categoryColors[rec.category] || "bg-slate-100 text-slate-700"}`}>
                          {rec.category}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${srcCfg.bg} ${srcCfg.text} ${srcCfg.border}`}>
                          <SrcIcon className="size-2.5" />
                          {srcCfg.label}
                        </span>
                        {confidence > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400">
                            <span className="w-8 h-1 rounded-full bg-slate-100 overflow-hidden">
                              <span
                                className="block h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round(confidence * 100)}%` }}
                              />
                            </span>
                            {Math.round(confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Impact */}
                      <div className="flex items-center gap-1 text-emerald-600 font-bold mb-3">
                        <Lightbulb className="size-3 shrink-0" />
                        <span className="text-[11px] leading-snug">{rec.impact}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApply(rec.id)}
                          className="flex items-center gap-1 px-3 h-7 bg-[#008a45] text-white rounded-full text-[11px] font-bold hover:bg-[#007a3d] transition-colors shadow-sm"
                        >
                          <Check className="size-3" /> OK
                        </button>
                        <button
                          onClick={() => handleDismiss(rec.id)}
                          className="flex items-center gap-1 px-3 h-7 bg-white border border-red-100 text-red-500 rounded-full text-[11px] font-bold hover:bg-red-50 transition-colors"
                        >
                          <X className="size-3" /> Dismiss
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                          className="ml-auto flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[11px] font-bold shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          {isExpanded ? "Less" : "More"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ──── RIGHT: NOTES PANEL ──── */}
        <div className="w-96 shrink-0 sticky top-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Notes Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="size-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-900">My Notes</h2>
                </div>
                {notes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {notes.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Click OK to save recommendations here</p>
            </div>

            {/* Notes List */}
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-50 mb-3">
                    <StickyNote className="size-5 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">No saved notes yet</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Click <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#008a45] text-white rounded text-[9px] font-bold"><Check className="size-2" />OK</span> on any recommendation
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notes.map((note) => {
                    const srcCfg = dataSourceConfig[note.data_source] || dataSourceConfig.rule_based
                    return (
                      <div
                        key={note.id}
                        className="px-4 py-3 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                              {note.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${categoryColors[note.category] || "bg-slate-100 text-slate-700"}`}>
                                {note.category}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${srcCfg.bg} ${srcCfg.text} ${srcCfg.border}`}>
                                {srcCfg.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-600 font-medium mt-1.5 leading-snug">
                              {note.impact}
                            </p>
                            <p className="text-[10px] text-slate-300 mt-1">
                              Saved at {note.savedAt}
                            </p>
                          </div>
                          {/* Note Actions */}
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleUndo(note.id)}
                              title="Move back to recommendations"
                              className="flex size-6 items-center justify-center rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                            >
                              <Undo2 className="size-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveNote(note.id)}
                              title="Remove from notes"
                              className="flex size-6 items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Clear All */}
            {notes.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/30">
                <button
                  onClick={() => setNotes([])}
                  className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="size-3" /> Clear All Notes
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}