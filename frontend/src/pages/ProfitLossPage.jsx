"use client"

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  X, Info, ChevronRight, Heart, Loader2, AlertCircle
} from "lucide-react";
import { apiFetch, API_BASE } from "../api";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d) {
  return d.toISOString().split("T")[0];
}

export default function ProfitLossPage() {
  const [selectedDish, setSelectedDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default: last 30 days
  const [endDate, setEndDate]     = useState(formatDate(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });

  const [summary, setSummary] = useState({ total_revenue: 0, total_cost: 0, total_waste: 0, net_profit: 0 });
  const [dishes, setDishes]   = useState([]);

  // ── Fetch P&L data ────────────────────────────────────────────────────────
  const fetchPL = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/orders/profit-loss?start_date=${startDate}&end_date=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setSummary(data.summary || { total_revenue: 0, total_cost: 0, total_waste: 0, net_profit: 0 });
      setDishes(data.dishes || []);
    } catch (err) {
      setError(err.message);
      setSummary({ total_revenue: 0, total_cost: 0, total_waste: 0, net_profit: 0 });
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchPL(); }, [fetchPL]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Revenue, costs & donation-loss breakdown per dish</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-slate-400" />
          <input 
            type="date" 
            className="h-9 w-36 px-3 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-sm text-slate-400 font-medium">to</span>
          <input 
            type="date" 
            className="h-9 w-36 px-3 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          label="Total Revenue" 
          value={summary.total_revenue} 
          icon={<span className="text-xl font-bold text-emerald-600">₹</span>} 
          bgColor="bg-emerald-50" 
        />
        <SummaryCard 
          label="Total Cost" 
          value={summary.total_cost} 
          icon={<TrendingDown className="size-5 text-rose-500" />} 
          bgColor="bg-rose-50" 
        />
        <SummaryCard 
          label="Donation Loss" 
          value={summary.total_waste} 
          icon={<Heart className="size-5 text-pink-500" />} 
          bgColor="bg-pink-50" 
        />
        <SummaryCard 
          label="Net Profit" 
          value={summary.net_profit} 
          icon={<TrendingUp className="size-5 text-emerald-600" />} 
          bgColor="bg-emerald-50" 
          isProfitValue
        />
      </div>

      {/* LOADING / ERROR / EMPTY STATES */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-emerald-500 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="size-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {!loading && !error && dishes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <TrendingUp className="size-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No sales or donations found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting the date range, or make some sales first!</p>
        </div>
      )}

      {/* TABLE SECTION */}
      {!loading && !error && dishes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Dish-wise Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dish</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost/Plate</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Revenue/Plate</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Sold</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Donated</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Profit/Plate</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dishes.map((dish) => {
                  const profitPerPlate = dish.revenue_per_plate - dish.cost_per_plate;
                  const isProfit = dish.net_profit >= 0;
                  return (
                    <tr 
                      key={dish.name} 
                      onClick={() => setSelectedDish(dish)}
                      className="group cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={dish.image ? `${API_BASE}${dish.image}` : ""}
                            alt="" 
                            className="size-9 rounded-lg object-cover shadow-sm bg-slate-100" 
                            onError={e => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100" }}
                          />
                          <span className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{dish.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-500 text-sm font-medium">₹{dish.cost_per_plate.toFixed(0)}</td>
                      <td className="px-4 py-4 text-right text-slate-900 text-sm font-semibold">₹{dish.revenue_per_plate.toFixed(0)}</td>
                      <td className="px-4 py-4 text-right text-slate-500 text-sm font-medium">{dish.orders}</td>
                      <td className="px-4 py-4 text-right">
                        {dish.donated > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-pink-50 text-pink-600 border-pink-100">
                            <Heart className="size-3 mr-1" />{dish.donated}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                          profitPerPlate > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'
                        }`}>
                          {profitPerPlate > 0 ? '+' : ''}₹{profitPerPlate.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${isProfit ? "text-emerald-600" : "text-rose-500"}`}>
                          {isProfit ? '' : '-'}₹{Math.abs(dish.net_profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-0 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedDish.image ? `${API_BASE}${selectedDish.image}` : ""}
                  className="size-10 rounded-lg object-cover bg-slate-100" 
                  alt=""
                  onError={e => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100" }}
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedDish.name}</h3>
                  <p className="text-xs text-slate-500">Profit Breakdown</p>
                </div>
              </div>
              <button onClick={() => setSelectedDish(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Revenue</span>
                  <span className="text-base font-bold text-slate-900">₹{selectedDish.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                  <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider">Costs</span>
                  <span className="text-base font-bold text-rose-600">₹{selectedDish.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className={`rounded-xl p-3 text-center border ${selectedDish.net_profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider ${selectedDish.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Net Profit</span>
                  <span className={`text-base font-bold ${selectedDish.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedDish.net_profit >= 0 ? '' : '-'}₹{Math.abs(selectedDish.net_profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full" />

              {/* Ingredient Breakdown */}
              {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Cost Breakdown per Plate</h4>
                  <div className="grid gap-1.5">
                    {selectedDish.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 px-3 bg-slate-50/50 rounded-lg border border-slate-100/50">
                        <span className="text-slate-500 font-medium">{ing.name}</span>
                        <span className="font-bold text-slate-900">
                          {ing.cost_per_plate !== null ? `₹${ing.cost_per_plate.toFixed(0)}` : 'N/A'}
                          <span className="text-xs text-slate-400 ml-1">({ing.qty}{ing.unit})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedDish.ingredients || selectedDish.ingredients.length === 0) && (
                <div className="text-center py-3">
                  <p className="text-sm text-slate-400">No recipe data found for this dish</p>
                </div>
              )}

              <div className="h-px bg-slate-100 w-full" />

              {/* Stats footer */}
              <div className="space-y-2">
                {selectedDish.donated > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Heart className="size-3 text-pink-500" /> Donation Loss</span>
                    <span className="font-bold text-rose-500">₹{selectedDish.waste_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({selectedDish.donated} plates)</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Plates Sold</span>
                  <span className="font-bold text-slate-900">{selectedDish.orders}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Profit Margin</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                    {selectedDish.profit_margin}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, bgColor, isProfitValue }) {
  const isNegative = value < 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`flex size-11 items-center justify-center rounded-xl ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`text-xl font-bold ${isProfitValue ? (isNegative ? 'text-rose-500' : 'text-emerald-600') : 'text-slate-900'}`}>
          {isNegative ? '-' : ''}₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}