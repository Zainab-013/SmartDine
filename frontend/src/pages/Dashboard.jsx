"use client"

import React, { useState, useEffect } from "react";
import { 
  IndianRupee, TrendingUp, Heart, 
  ArrowUpRight, ChevronRight, Sparkles 
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { apiFetch, API_BASE } from "../api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/stats")
      .then(res => res.json())
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => console.error("Error:", err));
  }, []);

  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "") return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.includes('/static/')) {
        return `${API_BASE}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    }
    return `${API_BASE}/static/uploads/${imagePath}`;
  };

  // Custom label: renders "XX.X%" just after the right edge of each bar
  const PercentageLabel = (props) => {
    const { x, y, width, height, value, totalOrders } = props;
    if (!value || !totalOrders) return null;
    const pct = ((value / totalOrders) * 100).toFixed(1);
    return (
      <text
        x={x + width + 6}
        y={y + height / 2 + 4}
        fontSize={11}
        fontWeight={700}
        fill="#10b981"
      >
        {pct}%
      </text>
    );
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Analyzing Real-time Data...</div>;

  // Total orders across all top dishes — used to compute each dish's share
  const totalOrders = (data.topSelling || []).reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Real-time performance for The Golden Fork</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.stats.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.type === 'donations' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {stat.type === 'sales' && <IndianRupee size={20} />}
                {stat.type === 'profit' && <TrendingUp size={20} />}
                {stat.type === 'donations' && <Heart size={20} />}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight size={14} /> {stat.change} <span className="text-slate-400 font-normal ml-1">vs last week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Actual vs AI Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Volume Leaderboard</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {/* margin.right gives space so the % text isn't clipped by the SVG edge */}
              <BarChart data={data.topSelling} layout="vertical" margin={{ right: 48 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} />
                <Bar dataKey="orders" fill="#10b981" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="orders"
                    content={(props) => (
                      <PercentageLabel {...props} totalOrders={totalOrders} />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          Top Performing Dishes <Sparkles size={18} className="text-amber-500" />
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.realTimeDishes && data.realTimeDishes.map((dish, idx) => (
            <div key={`${dish.name}-${idx}`} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative h-44 bg-slate-100">
                <img 
                  src={getImageUrl(dish.image)} 
                  alt={dish.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500"; 
                  }} 
                />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black bg-white/90 text-emerald-600 uppercase">
                  {dish.demand}
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-slate-900">{dish.name}</h4>
                <p className="text-slate-400 text-xs mb-3 font-medium uppercase">{dish.category}</p>
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                   <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                     <TrendingUp size={14} /> {dish.profit}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}