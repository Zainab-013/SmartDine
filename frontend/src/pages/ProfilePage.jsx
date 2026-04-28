"use client"

import React, { useState, useEffect } from "react"
import {
  User, Building2, MapPin, Phone, Mail, Globe, Camera,
  Pencil, Calendar, UtensilsCrossed, X, Check
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { apiFetch, API_BASE } from "../api"

export default function ProfilePage() {
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState({
    name: "", email: "", phone: "", restaurant: "",
    location: "", cuisine: "", capacity: "", established: "", website: "",
    image_url: "" // Added to store image path
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/api/profile/")
      const data = await res.json()
      setProfileData(data)
    } catch (err) {
      console.error("Failed to fetch profile", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    // UPDATED: Using FormData to handle both text and files
    const formData = new FormData(e.target)

    try {
      const res = await apiFetch("/api/profile/update", {
        method: "POST",
        // Note: Do NOT set Content-Type header when sending FormData
        body: formData 
      })

      if (res.ok) {
        fetchProfile() // Re-fetch to get the new image URL and fields
        setEditOpen(false)
        alert("Profile updated successfully")
      }
    } catch (err) {
        alert("Error updating profile")
    }
  }

  if (loading) return <div className="p-10 text-center">Loading Profile...</div>

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Toaster richColors />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your restaurant and owner details</p>
        </div>
        <button 
          onClick={() => setEditOpen(true)} 
          className="flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-sm font-semibold"
        >
          <Pencil className="size-4 mr-2" /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col items-center p-8 text-center">
            <div className="relative mb-6">
              {/* UPDATED: Show uploaded image if exists, otherwise show initials */}
              <div className="size-24 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                {profileData.image_url ? (
                  <img src={`${API_BASE}${profileData.image_url}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profileData.name?.substring(0, 2).toUpperCase() || "RC"
                )}
              </div>
              <button 
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors border-4 border-white"
              >
                <Camera className="size-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{profileData.name}</h2>
            <p className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mt-2">Owner & Head Chef</p>
            
            <div className="my-6 w-full border-t border-slate-100" />
            
            <div className="flex flex-col gap-4 w-full text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail className="size-4" />
                </div>
                <span className="text-slate-600">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone className="size-4" />
                </div>
                <span className="text-slate-600">{profileData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Calendar className="size-4" />
                </div>
                <span className="text-slate-600">Since {profileData.established}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 rounded-lg">
              <Building2 className="size-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900">Restaurant Details</h3>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Restaurant Name</span>
                <span className="text-sm font-semibold text-slate-900">{profileData.restaurant}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</span>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-900">{profileData.location}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuisine Type</span>
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="size-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-900">{profileData.cuisine}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seating Capacity</span>
                <span className="text-sm font-semibold text-slate-900">{profileData.capacity}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Established In</span>
                <span className="text-sm font-semibold text-slate-900">{profileData.established}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Official Website</span>
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 hover:underline cursor-pointer">{profileData.website}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              {/* PHOTO UPLOAD INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Update Photo</label>
                <input 
                  type="file" 
                  name="image" 
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Full Name</label>
                  <input name="name" defaultValue={profileData.name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Email Address</label>
                  <input name="email" defaultValue={profileData.email} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Phone Number</label>
                  <input name="phone" defaultValue={profileData.phone} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Restaurant Name</label>
                  <input name="restaurant" defaultValue={profileData.restaurant} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Location</label>
                <input name="location" defaultValue={profileData.location} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Cuisine Type</label>
                  <input name="cuisine" defaultValue={profileData.cuisine} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Seating Capacity</label>
                  <input name="capacity" defaultValue={profileData.capacity} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
              </div>

              {/* ADDED: Missing fields with correct name attributes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Established In</label>
                  <input name="established" defaultValue={profileData.established} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Official Website</label>
                  <input name="website" defaultValue={profileData.website} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditOpen(false)} 
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}