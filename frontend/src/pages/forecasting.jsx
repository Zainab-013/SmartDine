"use client"

import React, { useState, useEffect } from "react";
import { 
  Brain, Sparkles, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Check, X, Timer, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast, Toaster } from "sonner";
import { apiFetch, API_BASE } from "../api";

export default function ForecastingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    document.title = "AI Demand Forecasting"; 
    fetchForecastingData();
  }, [selectedDate]);

  const fetchForecastingData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/dishes/forecasting?date=${selectedDate}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      
      const data = await response.json();
      setForecastData(data);
      
      const formattedChartData = data.map(item => ({
        name: item.dish,
        Predicted: item.predicted,
        Actual: item.actual
      }));
      setChartData(formattedChartData);
      
    } catch (error) {
      console.error("Forecasting Error:", error);
      toast.error("AI Model connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to ensure images load correctly from Flask or Local Public folder
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/static')) return `${API_BASE}${imagePath}`;
    if (imagePath.startsWith('/images')) return imagePath; // Local Next.js public folder
    return `${API_BASE}/static/uploads/${imagePath}`;
  };

  const COLORS = {
    gold: "oklch(0.78 0.12 85)",
    emerald: "oklch(0.55 0.17 160)",
    textMuted: "oklch(0.48 0.02 250)"
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 transition-colors duration-500 text-slate-900 font-sans">
      <Toaster position="top-right" richColors />

      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Sales vs Predictions</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Showing actual billing data for: <span className="text-orange-500 font-bold">{selectedDate}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="size-5 text-orange-500 ml-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Dish Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {forecastData.map((dish, idx) => {
            const diff = dish.predicted - dish.actual;
            const isIncrease = diff > 0;
            return (
              <div
                key={dish.dish}
                onClick={() => setSelectedDish(dish)}
                style={{ animationDelay: `${idx * 100}ms` }}
                className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-md hover:border-[oklch(0.78_0.12_85_/_0.3)] transition-all duration-300 cursor-pointer group animate-in fade-in slide-in-from-bottom-4"
              >
                <div className="flex gap-4">
                  <div className="relative size-20 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-slate-50">
                    <img 
                        src={getImageUrl(dish.image)} 
                        alt={dish.dish} 
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                        onError={(e) => { e.target.src = "/images/placeholder.jpg"; }}
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <h3 className="font-bold text-base text-slate-800 truncate">{dish.dish}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Predicted</span>
                        <span className="text-xl font-black text-[oklch(0.78_0.12_85)] leading-none">{dish.predicted}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Actual Sold</span>
                        <span className="text-xl font-black text-[oklch(0.55_0.17_160)] leading-none">{dish.actual}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-1 flex items-center justify-center size-8 rounded-full ${isIncrease ? 'bg-[oklch(0.78_0.12_85_/_0.1)] text-[oklch(0.78_0.12_85)]' : 'bg-[oklch(0.55_0.17_160_/_0.1)] text-[oklch(0.55_0.17_160)]'}`}>
                    {isIncrease ? <ArrowUpRight className="size-4 stroke-[3]" /> : <ArrowDownRight className="size-4 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Analytics Chart */}
        <div className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm mb-10">
          <div className="flex items-center gap-3 mb-10">
            <Brain className="size-5 text-[oklch(0.78_0.12_85)]" />
            <h2 className="font-bold text-slate-800 tracking-tight">Demand Comparison Chart</h2>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9_0.005_250)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textMuted, fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textMuted, fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{borderRadius: '1rem', border: '1px solid oklch(0.9_0.005_250)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: '700'}} 
                />
                <Bar name="AI Predicted" dataKey="Predicted" fill={COLORS.gold} radius={[4, 4, 0, 0]} barSize={35} />
                <Bar name="Total Sold" dataKey="Actual" fill={COLORS.emerald} radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedDish && (
        <div 
          className="fixed inset-0 z-[100] flex justify-end bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedDish(null)}
        >
          <div 
            className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 w-full bg-slate-100">
              <img 
                src={getImageUrl(selectedDish.image)} 
                className="w-full h-full object-cover" 
                alt="" 
                onError={(e) => { e.target.src = "/images/placeholder.jpg"; }}
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDish(null);
                }} 
                className="absolute top-6 right-6 z-[110] bg-white/40 backdrop-blur-md p-2 rounded-xl text-slate-900 hover:bg-white transition-all shadow-lg cursor-pointer"
              >
                <X size={20} strokeWidth={3} />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.15_0.02_250_/_0.7)] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-8">
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">{selectedDish.dish}</h2>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[oklch(0.78_0.12_85_/_0.1)] p-4 rounded-2xl border border-[oklch(0.78_0.12_85_/_0.2)] text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Forecast</p>
                  <p className="text-2xl font-black text-[oklch(0.78_0.12_85)] leading-none">{selectedDish.predicted}</p>
                </div>
                <div className="bg-[oklch(0.55_0.17_160_/_0.1)] p-4 rounded-2xl border border-[oklch(0.55_0.17_160_/_0.2)] text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Actual</p>
                  <p className="text-2xl font-black text-[oklch(0.55_0.17_160)] leading-none">{selectedDish.actual}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Accuracy</p>
                  <p className="text-2xl font-black text-slate-800 leading-none">{selectedDish.accuracy}</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                {[
                  { l: "Peak Demand", v: selectedDish.peakTime, i: <Timer className="size-4" /> },
                  { l: "Avg Value", v: selectedDish.avgOrder, i: <Check className="size-4" /> },
                  { l: "Weekly Trend", v: selectedDish.trend, i: <TrendingUp className="size-4" /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                      {item.i} {item.l}
                    </div>
                    <span className="font-bold text-slate-900">{item.v}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSelectedDish(null)}
                className="w-full bg-[oklch(0.78_0.12_85)] text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:opacity-90 transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}