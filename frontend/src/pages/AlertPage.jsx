"use client"

import React, { useState, useEffect } from "react"
import {
  AlertTriangle, Bell, Package, ShoppingCart,
  Clock, Send, TruckIcon, X
} from "lucide-react"
import { apiFetch } from "../api"

// --- FETCH REAL DATA ---
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [restockOpen, setRestockOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [priority, setPriority] = useState("Normal")
  const [notifiedItems, setNotifiedItems] = useState(new Set())

  useEffect(() => {
    apiFetch('/api/inventory/alerts')
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching alerts:", err)
        setLoading(false)
      })
  }, [])

  const criticalCount = alerts.filter(a => a.urgency === "critical").length
  const warningCount = alerts.filter(a => a.urgency === "warning").length

  const handleRestock = (e) => {
    e.preventDefault()
    setRestockOpen(false)
    alert(`Restock order placed for ${selectedAlert?.ingredient} with ${priority} priority.`)
  }

  const handleNotify = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const message = formData.get('notifyMessage') || `Urgent: Low stock for ${selectedAlert?.ingredient}`

    try {
      const response = await apiFetch('/api/inventory/notify-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierEmail: selectedAlert?.supplierEmail,
          supplierName: selectedAlert?.supplier,
          ingredient: selectedAlert?.ingredient,
          currentStock: selectedAlert?.current,
          unit: selectedAlert?.unit,
          message: message
        })
      })
      const data = await response.json()
      setNotifyOpen(false)
      if (response.ok) {
        setNotifiedItems(prev => new Set(prev).add(selectedAlert?.ingredient))
        alert(`✅ Email sent successfully to ${selectedAlert?.supplierEmail}`)
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      setNotifyOpen(false)
      alert('❌ Cannot connect to server. Make sure Flask is running!')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-10 h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="size-8 border-4 border-[#008a45] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scanning Inventory Database...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Low Stock Alerts</h1>
              <p className="text-sm text-slate-500 mt-1">Monitor critical ingredient levels</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-[#ff4d4d] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                {criticalCount} Critical
              </span>
              <span className="bg-[#facc15] text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                {warningCount} Warning
              </span>
            </div>
          </div>

          {/* AI Alert Banner */}
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 p-4">
            <Bell className="size-5 text-[#ff4d4d] shrink-0" />
            <p className="text-sm text-slate-700">
              <strong className="text-slate-900">{criticalCount} ingredients</strong> are critically low.
              AI recommends ordering within <strong className="text-slate-900">2 hours</strong>.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => {
              const percentage = Math.min((alert.current / alert.max) * 100, 100)
              const isCritical = alert.urgency === "critical"

              return (
                <div
                  key={alert.ingredient}
                  className={`border-0 rounded-3xl shadow-sm transition-all duration-200 hover:shadow-md p-5 border ${isCritical ? "bg-white border-red-100" : "bg-white border-amber-100"
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-xl ${isCritical ? "bg-red-50" : "bg-amber-50"
                        }`}>
                        {isCritical ? (
                          <AlertTriangle className="size-5 text-[#ff4d4d]" />
                        ) : (
                          <Package className="size-5 text-[#d97706]" />
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900">{alert.ingredient}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${isCritical ? "border-red-200 text-[#ff4d4d] bg-red-50" : "border-amber-200 text-[#d97706] bg-amber-50"
                      }`}>
                      {alert.urgency}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-black text-slate-900">
                      {alert.current} <span className="text-xs font-medium text-slate-500">{alert.unit}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Threshold: {alert.threshold} {alert.unit}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${isCritical ? 'bg-[#ff4d4d]' : 'bg-[#facc15]'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-5">
                    <Clock className="size-3.5" />
                    <span>Runs out: {alert.runOutIn}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedAlert(alert); setPriority("Normal"); setRestockOpen(true) }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 ${isCritical ? "bg-[#ff4d4d] hover:bg-red-600" : "bg-[#d97706] hover:bg-amber-700"
                        }`}
                    >
                      <ShoppingCart className="size-3.5" /> Restock
                    </button>
                    <button
                      onClick={() => { setSelectedAlert(alert); setNotifyOpen(true) }}
                      disabled={notifiedItems.has(alert.ingredient)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        notifiedItems.has(alert.ingredient)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95"
                      }`}
                    >
                      <Send className="size-3.5" /> {notifiedItems.has(alert.ingredient) ? "Notified ✓" : "Notify"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* --- MODALS --- */}

          {/* Restock Order Modal */}
          {restockOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <TruckIcon className="size-5 text-[#008a45]" /> Restock {selectedAlert?.ingredient}
                  </h2>
                  <button onClick={() => setRestockOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="size-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleRestock} className="space-y-5">
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Current Stock</span>
                      <span className="font-bold text-slate-900">{selectedAlert?.current} {selectedAlert?.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Supplier</span>
                      <span className="font-bold text-slate-900">{selectedAlert?.supplier}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Order Quantity ({selectedAlert?.unit})</label>
                    <input
                      type="number"
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#008a45] outline-none"
                      defaultValue={(selectedAlert?.max - selectedAlert?.current).toFixed(1)}
                    />
                  </div>

                  {/* Priority Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Priority</label>
                    <div className="flex gap-2">
                      {["Urgent", "Normal", "Low"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${priority === p
                              ? p === "Urgent"
                                ? "bg-red-50 border-[#ff4d4d] text-[#ff4d4d]"
                                : "bg-emerald-50 border-[#008a45] text-[#008a45]"
                              : "border-slate-200 text-slate-400 hover:bg-slate-50"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setRestockOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-3 font-bold bg-[#008a45] text-white rounded-xl shadow-lg hover:shadow-emerald-200 transition-all">
                      Confirm Order
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Notify Supplier Modal */}
          {notifyOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Send className="size-5 text-[#008a45]" /> Notify Supplier
                  </h2>
                  <button onClick={() => setNotifyOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="size-5 text-slate-400" />
                  </button>
                </div>
                <form onSubmit={handleNotify} className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm text-slate-500 font-medium">Supplier: <span className="text-slate-900 font-bold">{selectedAlert?.supplier}</span></p>
                    <p className="text-sm text-slate-500 font-medium">Email: <span className="text-slate-900 font-bold">{selectedAlert?.supplierEmail}</span></p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Message</label>
                    <textarea
                      name="notifyMessage"
                      rows={4}
                      className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#008a45] resize-none text-sm leading-relaxed"
                      defaultValue={`Urgent: Low stock for ${selectedAlert?.ingredient} (${selectedAlert?.current} ${selectedAlert?.unit} remaining). Please confirm delivery time.`}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setNotifyOpen(false)}
                      className="flex-1 py-3 font-bold text-slate-400 border border-slate-100 hover:bg-slate-50 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 font-bold bg-[#008a45] text-white rounded-xl shadow-lg flex items-center justify-center gap-2 hover:shadow-emerald-200 transition-all text-sm"
                    >
                      <Send className="size-4" /> Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}