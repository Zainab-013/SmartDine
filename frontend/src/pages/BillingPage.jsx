"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Plus, Minus, Receipt, ShoppingCart, CheckCircle2, Clock,
  Eye, X, BarChart3, Heart, Trash2, TrendingUp, Package,
  ChefHat, HandHeart, RefreshCw, AlertTriangle, Bell
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { apiFetch, API_BASE } from "../api"

// ─── UI helpers ───────────────────────────────────────────────────────────────
const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
)
const CardContent = ({ children, className = "" }) => <div className={`p-6 ${className}`}>{children}</div>
const CardHeader = ({ children, className = "" }) => <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)
const Badge = ({ children, className = "" }) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
    {children}
  </div>
)
const Separator = () => <div className="h-[1px] w-full bg-slate-100" />

// ─── Elapsed-time helper ──────────────────────────────────────────────────────
// Returns { label, color, pulse } based on how long ago preparedAt was
function useElapsed(preparedAt) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calc = () => {
      const diff = (Date.now() - new Date(preparedAt).getTime()) / 1000 / 60 // minutes
      setElapsed(diff)
    }
    calc()
    const id = setInterval(calc, 60_000) // update every minute
    return () => clearInterval(id)
  }, [preparedAt])

  const hours = elapsed / 60
  if (hours < 4)  return { label: formatElapsed(elapsed), color: "text-emerald-600 bg-emerald-50 border-emerald-200", pulse: false }
  if (hours < 8)  return { label: formatElapsed(elapsed), color: "text-amber-600 bg-amber-50 border-amber-200",   pulse: false }
  return           { label: formatElapsed(elapsed), color: "text-red-600 bg-red-50 border-red-200",               pulse: true  }
}

function formatElapsed(minutes) {
  if (minutes < 60) return `${Math.floor(minutes)}m ago`
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

// ─── Per-dish timer badge (used in NGO tab) ───────────────────────────────────
function TimerBadge({ preparedAt }) {
  const { label, color, pulse } = useElapsed(preparedAt)
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[10px] font-bold ${color} ${pulse ? 'animate-pulse' : ''}`}>
      <Clock size={9} /> {label}
    </span>
  )
}

// ─── 9 PM daily reminder hook ─────────────────────────────────────────────────
function useNightlyReminder(pendingCount) {
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    const REMINDER_HOUR = 21 // 9 PM
    const STORAGE_KEY   = 'ngo_reminder_dismissed_date'

    const check = () => {
      const now            = new Date()
      const todayStr       = now.toDateString()
      const dismissedDate  = localStorage.getItem(STORAGE_KEY)
      const alreadyShown   = dismissedDate === todayStr
      const isReminderTime = now.getHours() >= REMINDER_HOUR

      if (isReminderTime && !alreadyShown && pendingCount > 0) {
        setShowReminder(true)
      }
    }

    check()
    // Re-check every minute so it triggers exactly at 9 PM
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [pendingCount])

  const dismissReminder = () => {
    localStorage.setItem('ngo_reminder_dismissed_date', new Date().toDateString())
    setShowReminder(false)
  }

  return { showReminder, dismissReminder }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BillingPage() {
  const [preparedOrders, setPreparedOrders] = useState([])
  const [salesHistory,   setSalesHistory]   = useState([])
  const [salesSummary,   setSalesSummary]   = useState([])
  const [donations,      setDonations]      = useState([])
  const [activeTab,      setActiveTab]      = useState("billing")

  // Cart: [{ prepared_order_id, dish_name, price, qty, max_qty, image }]
  const [cart, setCart] = useState([])

  // Modals
  
  const [invoiceOpen,   setInvoiceOpen]   = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [donateModal,   setDonateModal]   = useState({ open: false, item: null })
  const [ngoName,       setNgoName]       = useState("")
  const [ngoNotes,      setNgoNotes]      = useState("")
  const [donateQty,     setDonateQty]     = useState(1)
  const [loading,       setLoading]       = useState(false)

  // NGO 9 PM reminder
  const pendingCount = preparedOrders.filter(p => p.status === 'prepared').length
  const { showReminder, dismissReminder } = useNightlyReminder(pendingCount)

  // 1. Define readyItems (needed for the Billing and NGO tabs)
const readyItems = preparedOrders.filter(
  p => p.status === 'prepared' && p.quantity > 0
);

// 2. Define chartData (needed for the Recharts BarChart)
// We map salesHistory to a format Recharts understands { time, total }
const chartData = salesHistory.map(sale => ({
  time: sale.id ? `#${sale.id}` : "Order", // Using ID as label
  total: Number(sale.total)
})).reverse().slice(-7); // Show last 7 sales

// 3. Define missing Modal handlers
const openDonateModal = (item) => {
  setDonateModal({ open: true, item: item });
  setDonateQty(item.quantity); // Default to all available
};

const handleDonate = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await apiFetch(`/api/prepared-orders/${donateModal.item.id}/donate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: donateQty,
        ngo_name: ngoName,
        notes: ngoNotes
      })
    });
    if (!res.ok) throw new Error("Donation failed");
    
    // Reset and Refresh
    setDonateModal({ open: false, item: null });
    setNgoName("");
    setNgoNotes("");
    loadPrepared();
    loadDonations();
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};

const deleteDonation = async (id) => {
  if (!window.confirm("Delete this donation record?")) return;
  try {
    await apiFetch(`/api/kitchen-donations/${id}`, { method: 'DELETE' });
    loadDonations();
  } catch (err) {
    console.error(err);
  }
};

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadPrepared = useCallback(() =>
    apiFetch("/api/prepared-orders?status=prepared")
      .then(r => r.json()).then(setPreparedOrders)
      .catch(console.error), [])

  const loadOrders = useCallback(() =>
    apiFetch("/api/orders")
      .then(r => r.json()).then(setSalesHistory)
      .catch(console.error), [])

  const loadSalesSummary = useCallback(() =>
    apiFetch("/api/orders/sales-summary")
      .then(r => r.json()).then(setSalesSummary)
      .catch(console.error), [])

  const loadDonations = useCallback(() =>
    apiFetch("/api/kitchen-donations/")
      .then(r => r.json()).then(setDonations)
      .catch(console.error), [])

  useEffect(() => {
    loadPrepared(); loadOrders(); loadSalesSummary(); loadDonations()
  }, [])

  useEffect(() => {
    if (activeTab === "billing") loadPrepared()
    if (activeTab === "history") { loadOrders(); loadSalesSummary() }
    if (activeTab === "ngo")     { loadPrepared(); loadDonations() }
  }, [activeTab])

// ── Cart helpers ──────────────────────────────────────────────────────────────
  const addToCart = (dish) => {
    const existing = cart.find(c => c.prepared_order_id === dish.id)
    if (existing) {
      if (existing.qty >= existing.max_qty) return 
      setCart(cart.map(c =>
        c.prepared_order_id === dish.id ? { ...c, qty: c.qty + 1 } : c
      ))
    } else {
      setCart([...cart, {
        prepared_order_id: dish.id,
        dish_name: dish.dish_name,
        price: dish.price,
        qty: 1,
        max_qty: dish.quantity,
        image: dish.image
      }])
    }
  }

  const updateCartQty = (prepared_order_id, delta) => {
    setCart(cart.map(c => {
      if (c.prepared_order_id !== prepared_order_id) return c
      const newQty = c.qty + delta
      if (newQty <= 0) return null
      if (newQty > c.max_qty) return c 
      return { ...c, qty: newQty }
    }).filter(Boolean))
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax  

// ── Complete Order (Single Transaction) ─────────────────────────────────────
  const completeOrder = async () => {
    if (cart.length === 0 || loading) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/orders/checkout", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total: total,
          subtotal: subtotal,
          tax: tax
        })
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Checkout failed");
      }

      const result = await res.json();

      const receiptOrder = {
        id: result.order_id,
        time: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        items: cart.map(c => ({ name: c.dish_name, qty: c.qty, price: c.price })),
        total: total
      };

      //setSelectedOrder(receiptOrder);
      //setInvoiceOpen(true);
      alert("Order completed successfully!");
      setCart([]);
      
      loadPrepared();
      loadOrders();
      loadSalesSummary();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 bg-slate-50 min-h-screen">

      {/* ── 9 PM NGO Reminder Overlay ──────────────────────────────────────── */}
      {showReminder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-pink-600 to-rose-500 p-8 text-white text-center">
              <Bell size={40} className="mx-auto mb-3 animate-bounce" />
              <h2 className="text-2xl font-black">End of Day Reminder</h2>
              <p className="text-pink-100 text-sm mt-1">It's 9 PM — time to check unsold food</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-pink-700">{pendingCount}</p>
                <p className="text-sm text-pink-600 font-medium">dish{pendingCount !== 1 ? 'es' : ''} still unsold in kitchen</p>
              </div>
              <p className="text-sm text-slate-500 text-center">
                Consider donating unsold food to NGOs to reduce waste.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={dismissReminder}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => { dismissReminder(); setActiveTab("ngo") }}
                  className="flex-[2] py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Heart size={16} /> Go to NGO Donations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Sales</h1>
        <p className="text-sm text-slate-500 mt-1">Sell prepared dishes, track sales and manage food donations</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 p-1 rounded-lg w-fit border border-slate-200 gap-1 flex-wrap">
        {[
          { key: "billing", icon: <ShoppingCart size={14} />, label: "Billing" },
          { key: "history", icon: <Clock size={14} />,        label: "Sales History" },
          { key: "sales",   icon: <TrendingUp size={14} />,   label: "Sales Report" },
          { key: "ngo",     icon: <Heart size={14} />,        label: `NGO Donations${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ].map(tab => (
          <button key={tab.key}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: BILLING ─────────────────────────────────────────────────────── */}
      {activeTab === "billing" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Prepared dishes grid */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-800">{readyItems.length}</span> prepared dish{readyItems.length !== 1 ? 'es' : ''} available
              </p>
              <button onClick={loadPrepared} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {readyItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ChefHat size={36} className="mb-3 opacity-20" />
                  <p className="font-medium">No prepared dishes yet</p>
                  <p className="text-xs mt-1">Go to Menu → select dishes → confirm preparation</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {readyItems.map(dish => {
                  const inCart    = cart.find(c => c.prepared_order_id === dish.id)
                  const cartQty   = inCart?.qty || 0
                  const remaining = dish.quantity - cartQty
                  const atMax     = cartQty >= dish.quantity

                  return (
                    <div key={dish.id}
                      onClick={() => !atMax && addToCart(dish)}
                      className={`group bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${atMax ? 'border-slate-200 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:border-emerald-500 cursor-pointer'}`}>
                      <div className="relative h-32 w-full bg-slate-100">
                        <img
                          src={dish.image ? `${API_BASE}${dish.image}` : ""}
                          alt={dish.dish_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={e => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300" }}
                        />
                        {/* Available qty badge */}
                        <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {remaining} left
                        </div>
                        {!atMax && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                            <Plus className="text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                        {atMax && (
                          <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-full shadow">Added</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{dish.dish_name}</h3>
                        <p className="text-emerald-600 font-bold text-sm">₹{Number(dish.price).toFixed(2)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Bill / Cart ───────────────────────────────────────────────────── */}
          <Card className="lg:col-span-2 h-fit sticky top-6 shadow-md border-none">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Receipt size={18} /> Current Order
                </CardTitle>
                <Badge className="bg-emerald-500 text-white border-none">
                  {cart.reduce((s, c) => s + c.qty, 0)} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-slate-400">
                  <ShoppingCart size={40} className="mb-2 opacity-20" />
                  <p className="text-sm">Click a dish to add it</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[340px] overflow-y-auto space-y-4 pr-1">
                    {cart.map(item => (
                      <div key={item.prepared_order_id} className="flex items-center gap-3">
                        <img
                          src={item.image ? `${API_BASE}${item.image}` : ""}
                          className="size-12 rounded-lg object-cover shrink-0"
                          onError={e => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.dish_name}</p>
                          <p className="text-xs text-slate-400">₹{item.price.toFixed(2)} · max {item.max_qty}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <button onClick={() => updateCartQty(item.prepared_order_id, -1)} className="p-0.5 rounded hover:text-red-500"><Minus size={13} /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.prepared_order_id, 1)}
                            disabled={item.qty >= item.max_qty}
                            className="p-0.5 rounded hover:text-emerald-600 disabled:opacity-30">
                            <Plus size={13} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-slate-800 w-16 text-right shrink-0">
                          ₹{(item.price * item.qty).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-1.5 text-sm text-slate-600 font-medium">
                    <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tax (8%)</span><span>₹{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total</span><span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={completeOrder}
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {loading ? "Processing..." : "Complete Order"}
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: SALES HISTORY ───────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> Daily Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesHistory.length === 0
                    ? <tr><td colSpan="6" className="text-center py-10 text-slate-400">No sales yet</td></tr>
                    : salesHistory.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-slate-900">#ORD-{sale.id}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{sale.time}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {sale.items?.map(i => `${i.name} ×${i.qty}`).join(', ') || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">
                              <CheckCircle2 size={10} className="mr-1" /> {sale.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">₹{Number(sale.total).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => { setSelectedOrder(sale); setInvoiceOpen(true) }}
                              className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-100 transition-colors">
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: SALES REPORT ────────────────────────────────────────────────── */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: `₹${salesSummary.reduce((s, r) => s + r.total_revenue, 0).toFixed(2)}`, bg: "bg-emerald-50/50", iconBg: "bg-emerald-600", icon: <TrendingUp size={20} />, text: "text-emerald-900", sub: "text-emerald-800" },
              { label: "Dishes Sold",   value: salesSummary.reduce((s, r) => s + r.total_qty, 0),    bg: "bg-blue-50/50",    iconBg: "bg-blue-600",    icon: <Package size={20} />,   text: "text-blue-900",    sub: "text-blue-800" },
              { label: "Menu Items",    value: salesSummary.length,                                  bg: "bg-amber-50/50",   iconBg: "bg-amber-500",   icon: <BarChart3 size={20} />, text: "text-amber-900",   sub: "text-amber-800" },
            ].map(s => (
              <Card key={s.label} className={`border-none ${s.bg}`}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className={`${s.iconBg} p-2 rounded-lg text-white`}>{s.icon}</div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${s.sub}`}>{s.label}</p>
                    <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {salesSummary.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> Best Selling Dishes</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[260px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesSummary.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="dish_name" type="category" fontSize={11} tickLine={false} axisLine={false} width={120} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="total_qty" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18} name="Qty Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Dish-wise Breakdown</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Dish</th>
                    <th className="px-6 py-4 text-right">Qty Sold</th>
                    <th className="px-6 py-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesSummary.length === 0
                    ? <tr><td colSpan="4" className="text-center py-10 text-slate-400">No data yet</td></tr>
                    : salesSummary.map((row, idx) => (
                        <tr key={row.dish_name} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {idx === 0 && <span className="mr-1">🏆</span>}{row.dish_name}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100">{row.total_qty} plates</Badge>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700">₹{row.total_revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: NGO DONATIONS ───────────────────────────────────────────────── */}
      {activeTab === "ngo" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Unsold Food → NGO Donations</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Dishes prepared but not yet sold. Donate before end of day to reduce food waste.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-none bg-pink-50/50">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="bg-pink-600 p-2 rounded-lg text-white"><Heart size={20} /></div>
                <div>
                  <p className="text-xs font-semibold text-pink-800 uppercase tracking-wider">Total Donations Logged</p>
                  <p className="text-2xl font-bold text-pink-900">{donations.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-orange-50/50">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="bg-orange-500 p-2 rounded-lg text-white"><Package size={20} /></div>
                <div>
                  <p className="text-xs font-semibold text-orange-800 uppercase tracking-wider">Plates Donated</p>
                  <p className="text-2xl font-bold text-orange-900">{donations.reduce((s, d) => s + d.quantity, 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending prepared dishes */}
          {readyItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Still in Kitchen ({readyItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyItems.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="relative h-36 bg-slate-100">
                      <img
                        src={item.image ? `${API_BASE}${item.image}` : ""}
                        alt={item.dish_name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400" }}
                      />
                      {/* Timer badge overlay */}
                      <div className="absolute top-2 right-2">
                        <TimerBadge preparedAt={item.prepared_at} />
                      </div>
                      <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.quantity} plates
                      </div>
                    </div>
                    <CardContent className="space-y-3 py-4">
                      <h4 className="font-bold text-slate-900">{item.dish_name}</h4>
                      <button
                        onClick={() => openDonateModal(item)}
                        className="w-full py-2 bg-pink-600 text-white rounded-xl font-bold text-sm hover:bg-pink-700 transition-all flex items-center justify-center gap-2">
                        <HandHeart size={15} /> Donate to NGO
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Donation log */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Donation Log</h3>
            <Card className="border-none shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Dish</th>
                      <th className="px-6 py-4">Qty</th>
                      <th className="px-6 py-4">NGO</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Notes</th>
                      <th className="px-6 py-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {donations.length === 0
                      ? <tr><td colSpan="6" className="text-center py-10 text-slate-400">No donation records yet</td></tr>
                      : donations.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-semibold text-slate-900">{d.dish_name}</td>
                            <td className="px-6 py-4">
                              <Badge className="bg-pink-50 text-pink-700 border-pink-100">{d.quantity} {d.unit}</Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">{d.ngo_name || '—'}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{d.donation_date || d.donated_at}</td>
                            <td className="px-6 py-4 text-slate-400 text-xs italic max-w-[160px] truncate">{d.notes || '—'}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => deleteDonation(d.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Invoice / Receipt Modal ───────────────────────────────────────────── */}
      {invoiceOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Receipt</h2>
              <button onClick={() => setInvoiceOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Header */}
            <div className="text-center mb-5">
              <h3 className="text-2xl font-black text-slate-900">SmartDine</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest">
                {selectedOrder.id ? `Order #ORD-${selectedOrder.id}` : 'Order Confirmed'}
              </p>
            </div>

            <div className="space-y-4">
              {/* Date/time */}
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Date / Time</span>
                <span>{selectedOrder.time}</span>
              </div>

              <Separator />

              {/* Line items — every dish in the order */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items Ordered</p>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">₹{Number(item.price).toFixed(2)} × {item.qty}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      ₹{(Number(item.price) * item.qty).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{(selectedOrder.total / 1.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>₹{(selectedOrder.total - selectedOrder.total / 1.08).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-xl pt-1 border-t border-slate-100">
                <span>Total Paid</span>
                <span className="text-emerald-600">₹{Number(selectedOrder.total).toFixed(2)}</span>
              </div>

              <div className="bg-emerald-50 text-emerald-700 text-center py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> TRANSACTION SUCCESSFUL
              </div>

              <button onClick={() => window.print()}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Donate Modal ─────────────────────────────────────────────────────── */}
      {donateModal.open && donateModal.item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <HandHeart size={18} className="text-pink-500" /> Donate to NGO
              </h2>
              <button onClick={() => setDonateModal({ open: false, item: null })} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Dish summary */}
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 mb-4 space-y-1">
              <p className="font-bold text-slate-900">{donateModal.item.dish_name}</p>
              <p className="text-sm text-slate-500">
                Available: <span className="font-semibold text-slate-700">{donateModal.item.quantity} plates</span>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <TimerBadge preparedAt={donateModal.item.prepared_at} />
              </div>
            </div>

            <form onSubmit={handleDonate} className="space-y-4">
              {/* Qty selector */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Plates to Donate</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-fit">
                  <button type="button" onClick={() => setDonateQty(q => Math.max(1, q - 1))}
                    className="p-1 text-slate-400 hover:text-slate-700"><Minus size={16} /></button>
                  <span className="font-bold text-lg min-w-[24px] text-center">{donateQty}</span>
                  <button type="button" onClick={() => setDonateQty(q => Math.min(donateModal.item.quantity, q + 1))}
                    className="p-1 text-emerald-600 hover:text-emerald-700"><Plus size={16} /></button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">NGO Name</label>
                <input type="text" placeholder="e.g. Robin Hood Army"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={ngoName} onChange={e => setNgoName(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes (optional)</label>
                <textarea placeholder="Any additional notes..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 resize-none"
                  value={ngoNotes} onChange={e => setNgoNotes(e.target.value)} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <Heart size={16} /> Confirm Donation ({donateQty} plates)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}