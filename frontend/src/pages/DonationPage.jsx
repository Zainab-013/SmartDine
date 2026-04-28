"use client"

import React, { useState, useEffect } from "react"
import {
  Heart, Clock, CheckCircle2, Package, MapPin, Phone,
  ArrowRight, ArrowLeft, Sparkles, Users, Leaf, Timer,
  Building2, X
} from "lucide-react"
import { apiFetch } from "../api"

const API_BASE = "/api/donations"

export default function DonationsPage() {
  const [step, setStep] = useState(1)
  const [selectedFood, setSelectedFood] = useState([])
  const [selectedNgo, setSelectedNgo] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  // Real data state
  const [leftovers, setLeftovers] = useState([])
  const [ngos, setNgos] = useState([])
  const [donationHistory, setDonationHistory] = useState([])
  const [stats, setStats] = useState({ totalMeals: 0, totalWeight: 0 })
  const [loading, setLoading] = useState(true)

  // Fetch all data on mount
  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/leftovers`).then(r => r.json()),
      apiFetch(`${API_BASE}/ngos`).then(r => r.json()),
      apiFetch(`${API_BASE}/history`).then(r => r.json()),
      apiFetch(`${API_BASE}/stats`).then(r => r.json()),
    ])
      .then(([leftoverData, ngoData, historyData, statsData]) => {
        setLeftovers(leftoverData)
        setNgos(ngoData)
        setDonationHistory(historyData)
        setStats(statsData)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching donation data:", err)
        setLoading(false)
      })
  }, [])

  const toggleFood = (name) => {
    setSelectedFood(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  const handleConfirmDonation = () => {
    const totalWeight = selectedFood.length * 2.5

    apiFetch(`${API_BASE}/create`, {
      method: "POST",
      body: JSON.stringify({
        food_items: selectedFood.join(", "),
        total_weight: totalWeight,
        ngo: selectedNgo
      })
    })
      .then(res => res.json())
      .then(newDonation => {
        setShowSuccess(true)
        // Update the history and stats live
        setDonationHistory(prev => [newDonation, ...prev])
        setStats(prev => ({
          totalMeals: prev.totalMeals + 1,
          totalWeight: round(prev.totalWeight + totalWeight, 1)
        }))
        setTimeout(() => {
          setShowSuccess(false)
          setStep(1)
          setSelectedFood([])
          setSelectedNgo("")
        }, 3000)
      })
      .catch(err => {
        console.error("Donation failed:", err)
        alert("Failed to save donation. Please try again.")
      })
  }

  // Helper
  function round(val, dec) {
    return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 m-6">
        <div className="size-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Donation Module...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-[#fcfcfc] min-h-screen text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Food Donation</h1>
          <p className="text-sm text-slate-500 mt-1">Reduce waste by donating surplus food to partner NGOs</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 border border-emerald-100 shadow-sm">
            <Heart className="size-4 text-emerald-600" />
            <div className="text-xs">
              <span className="font-bold text-emerald-700">{stats.totalMeals}</span>
              <span className="text-slate-600 ml-1">Meals Donated</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 border border-amber-100 shadow-sm">
            <Leaf className="size-4 text-amber-600" />
            <div className="text-xs">
              <span className="font-bold text-amber-700">{stats.totalWeight} kg</span>
              <span className="text-slate-600 ml-1">Waste Reduced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      {step <= 3 && (
        <div className="flex items-center gap-2 w-full max-w-3xl mx-auto py-4">
          {[
            { num: 1, label: "Identify Leftovers" },
            { num: 2, label: "Select NGO" },
            { num: 3, label: "Confirm Donation" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step >= s.num ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {step > s.num ? <CheckCircle2 className="size-4" /> : s.num}
                </div>
                <span className={`text-xs font-semibold hidden md:block ${step >= s.num ? "text-emerald-700" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`h-1 flex-1 rounded-full mx-2 ${step > s.num ? "bg-emerald-600" : "bg-slate-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Success View */}
      {showSuccess && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-emerald-50 border border-emerald-100 p-12 text-center animate-in zoom-in-95 duration-300">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-200 mb-6">
            <CheckCircle2 className="size-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Donation Successful!</h3>
          <p className="text-slate-600 mt-3 max-w-md leading-relaxed">
            The selected NGO has been notified and will arrange pickup. Thank you for making a difference!
          </p>
        </div>
      )}

      {/* STEP 1: FOOD SELECTION */}
      {step === 1 && !showSuccess && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-bold text-slate-800 px-1">Step 1: Identify Leftover Food</h2>
          {leftovers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Package className="size-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-400">No leftover food items found.</p>
              <p className="text-xs text-slate-400 mt-1">Add dishes to your menu first!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leftovers.map((food) => (
              <div
                key={food.name}
                onClick={() => food.safe && toggleFood(food.name)}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 cursor-pointer ${
                  selectedFood.includes(food.name) 
                  ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-md" 
                  : "border-slate-100 bg-white hover:border-emerald-200 hover:shadow-lg"
                } ${!food.safe ? "opacity-90 cursor-not-allowed" : ""}`}
              >
                <div className="flex gap-4 p-5">
                  {/* Image with grayscale filter if safety window expired */}
                  <div className={`relative size-20 rounded-2xl overflow-hidden shrink-0 shadow-inner bg-slate-100 ${!food.safe ? "grayscale opacity-80" : ""}`}>
                    <img src={food.image} alt={food.name} className="object-cover h-full w-full group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className={`font-bold truncate ${!food.safe ? "text-slate-400" : "text-slate-900"}`}>{food.name}</h3>
                      {selectedFood.includes(food.name) && (
                        <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-400 mt-1">Qty: {food.qty}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-400">
                      <Clock className="size-3.5" /> Prep: {food.prepTime}
                    </div>
                    
                    {/* Safety Window Section */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-bold mb-1.5">
                        <span className="text-slate-400">Safety window</span>
                        <span className={food.safe ? "text-emerald-600" : "text-red-400"}>{food.hoursLeft}h left</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${food.safe ? "bg-emerald-500" : "bg-red-400"}`}
                          style={{ width: `${(food.hoursLeft / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Updated Red Safety Alert Banner to match second image */}
                {!food.safe && (
                  <div className="bg-red-50/80 px-4 py-2.5 text-[11px] font-bold text-red-500 flex items-center gap-2 border-t border-red-100/50">
                    <Timer className="size-3.5" /> Safety window expired - not suitable for donation
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={selectedFood.length === 0}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
            >
              Continue <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: NGO SELECTION */}
      {step === 2 && !showSuccess && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-bold text-slate-800">Step 2: Select Partner NGO</h2>
          {ngos.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Building2 className="size-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-400">No NGOs registered yet.</p>
              <p className="text-xs text-slate-400 mt-1">Run the seed script to add partner NGOs.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ngos.map((ngo) => (
              <div
                key={ngo.name}
                onClick={() => setSelectedNgo(ngo.name)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                  selectedNgo === ngo.name 
                  ? "border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500/10" 
                  : "border-slate-100 bg-white hover:border-emerald-200"
                }`}
              >
                <div className="flex gap-4">
                  <div className="size-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Building2 className="size-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900">{ngo.name}</h3>
                      {selectedNgo === ngo.name && <CheckCircle2 className="size-5 text-emerald-600" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="size-3" /> {ngo.location}
                    </div>
                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">{ngo.description}</p>
                    <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-100 rounded-xl w-fit">
                      <Users className="size-3.5 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Capacity: {ngo.capacity}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(1)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors flex items-center gap-2">
              <ArrowLeft className="size-5" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedNgo}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              Continue <ArrowRight className="size-5 ml-2 inline" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRM FORM */}
      {step === 3 && !showSuccess && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-bold text-slate-800">Step 3: Confirm Donation Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Donation Summary</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">Selected NGO</label>
                  <input type="text" readOnly value={selectedNgo} className="w-full p-3 rounded-xl bg-slate-50 border-none font-semibold text-slate-700 focus:ring-0 cursor-default" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">Food Items</label>
                  <textarea readOnly value={selectedFood.join(", ")} className="w-full p-3 rounded-xl bg-slate-50 border-none font-semibold text-slate-700 resize-none h-20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">Estimated Total Weight</label>
                  <input type="text" readOnly value={`${(selectedFood.length * 2.5).toFixed(1)} kg`} className="w-full p-3 rounded-xl bg-slate-50 border-none font-semibold text-slate-700" />
                </div>
              </div>
            </div>

            {/* Pickup Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Pickup Logistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">Date</label>
                  <input type="date" defaultValue="2026-03-29" className="w-full p-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">Preferred Time</label>
                  <input type="time" defaultValue="18:30" className="w-full p-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 px-1">Contact Number</label>
                <input type="tel" defaultValue="+91 98765 43210" className="w-full p-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 px-1">Special Instructions</label>
                <textarea placeholder="e.g. Enter from the back gate..." className="w-full p-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-medium h-20 resize-none" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors">
              Back
            </button>
            <button
              onClick={handleConfirmDonation}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center gap-3"
            >
              <Heart className="size-5 fill-white" /> Confirm Donation
            </button>
          </div>
        </div>
      )}

      {/* --- HISTORY SECTION --- */}
      <hr className="my-8 border-slate-100" />
      
      <div className="space-y-6 pb-12">
        <h2 className="text-xl font-bold text-slate-900">Donation History & Status</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Live Tracking</h3>
            <div className="space-y-0">
              {[
                { label: "Leftover Identified", time: "2:30 PM", status: "done" },
                { label: "NGO Assigned", time: "2:45 PM", status: "done" },
                { label: "Pickup Scheduled", time: "3:00 PM", status: "done" },
                { label: "Donation Complete", time: "4:15 PM", status: "done" },
              ].map((event, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="size-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <div className="size-2.5 rounded-full bg-emerald-600" />
                    </div>
                    {i < arr.length - 1 && <div className="w-0.5 h-10 bg-emerald-50" />}
                  </div>
                  <div className="pb-8">
                    <p className="text-sm font-bold text-slate-800">{event.label}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">ID</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Food Item</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">NGO</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">Date</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {donationHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400 font-medium">
                        No donations yet. Make your first donation above!
                      </td>
                    </tr>
                  ) : (
                    donationHistory.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{d.id}</td>
                        <td className="px-6 py-4 text-slate-600">{d.food}</td>
                        <td className="px-6 py-4 text-slate-600">{d.ngo}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-medium">{d.date}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase border border-emerald-100">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}