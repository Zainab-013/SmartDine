import React, { useState, useEffect } from "react";
import {
  Plus, Search, Minus, Pencil, Trash2, X, Upload, Loader2, Check,
  Clock, ArrowRight, Calendar, AlertTriangle, CheckCircle2, ShieldAlert
} from "lucide-react";
import { apiFetch, API_BASE } from "../api";

export default function MenuPage({ setActivePage }) {
  const [search, setSearch] = useState("");
  const [selectedDish, setSelectedDish] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [checkedIds, setCheckedIds] = useState(new Set());
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [timeLeft, setTimeLeft] = useState(86400);

  // Availability check state
  const [availabilityData, setAvailabilityData] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", category: "", cost: "", profit: "", description: "",
    ingredients: [{ name: "", amount: "" }]
  });
  const [dishes, setDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => { fetchDishes(); }, []);

  useEffect(() => {
    let timer;
    if (isTimerModalOpen && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerModalOpen, timeLeft]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const fetchDishes = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/dishes/all');
      const data = await res.json();
      setDishes(data);
    } catch (err) {
      console.error("Database error:", err);
      setDishes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheckbox = (e, id) => {
    e.stopPropagation();
    const newChecked = new Set(checkedIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedIds(newChecked);
  };

  const handleNextStep = async () => {
    const items = dishes
      .filter(d => checkedIds.has(d.id))
      .map(d => ({
        ...d,
        orderQty: 1,
        queueDate: new Date().toISOString().split('T')[0],
        parsedIngs: d.ingredients
          ? d.ingredients.split(',').map(ing => {
              const match = ing.match(/(.*?)\s\((\d*\.?\d+)(.*)\)/);
              return match
                ? { name: match[1].trim(), val: parseFloat(match[2]), unit: match[3] }
                : { name: ing.trim(), val: 0, unit: "" };
            })
          : []
      }));
    setOrderItems(items);
    setIsTimerModalOpen(true);
    await checkAvailability(items);
  };

  const checkAvailability = async (items) => {
    setAvailabilityLoading(true);
    try {
      const res = await apiFetch('/api/dishes/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      const map = {};
      data.forEach(d => {
        // ── FIX: Store baseAmountPerUnit for each ingredient so that
        //   updateOrderQty can always scale from the correct per-unit amount,
        //   regardless of how many times the user increments/decrements.
        //   The API is called with orderQty=1 for every item, so
        //   ing.needed at this point == the per-unit requirement.
        map[d.dish_id] = {
          ...d,
          ingredients: d.ingredients.map(ing => ({
            ...ing,
            baseAmountPerUnit: ing.needed   // ← save the "per 1 dish" amount
          }))
        };
      });
      setAvailabilityData(map);
    } catch (err) {
      console.error("Availability check failed:", err);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const updateOrderQty = (id, delta) => {
    setOrderItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.orderQty + delta);

          const dishData = availabilityData[id];

          if (dishData) {
            const updatedIngredients = dishData.ingredients.map(ing => {
              // ── FIX: Always multiply from the stored baseAmountPerUnit.
              //   Previously the code divided ing.needed / item.orderQty which
              //   drifted with every click because item.orderQty is stale inside
              //   this closure and ing.needed had already been mutated.
              const newTotalNeeded = ing.baseAmountPerUnit * newQty;

              return {
                ...ing,
                needed: newTotalNeeded,
                ok: newTotalNeeded <= ing.available
              };
            });

            setAvailabilityData(prevData => ({
              ...prevData,
              [id]: {
                ...prevData[id],
                ingredients: updatedIngredients,
                can_prepare: updatedIngredients.every(i => i.ok)
              }
            }));
          }

          return { ...item, orderQty: newQty };
        }
        return item;
      });
    });
  };

  const updateItemDate = (id, newDate) => {
    setOrderItems(prev => prev.map(item =>
      item.id === id ? { ...item, queueDate: newDate } : item
    ));
  };

  const allCanPrepare = orderItems.length > 0 && orderItems.every(
    item => availabilityData[item.id]?.can_prepare !== false
  );

  const handleRedirectToBilling = async () => {
    if (!allCanPrepare && Object.keys(availabilityData).length > 0) {
      alert("⚠️ Cannot proceed — some ingredients are insufficient. Please check the highlighted items.");
      return;
    }
    try {
      const response = await apiFetch('/api/dishes/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: orderItems.map(item => ({ ...item, date: item.queueDate }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('lastPreparedIds', result.prepared_ids);
        setIsTimerModalOpen(false);
        setCheckedIds(new Set());
        setActivePage("Billing & Sales");
      } else {
        const err = await response.json();
        alert("Failed to process order: " + (err.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Connection to server failed.");
    }
  };

  const handleImageChange = (e) => setImageFile(e.target.files[0]);

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };
  const addIngredientRow = () =>
    setFormData({ ...formData, ingredients: [...formData.ingredients, { name: "", amount: "" }] });
  const removeIngredientRow = (index) => {
    if (formData.ingredients.length > 1) {
      setFormData({ ...formData, ingredients: formData.ingredients.filter((_, i) => i !== index) });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('cost', formData.cost);
    formDataToSend.append('profit', formData.profit);
    formDataToSend.append('description', formData.description);
    const ingredientsString = formData.ingredients
      .filter(ing => ing.name.trim() !== "")
      .map(ing => `${ing.name} (${ing.amount})`)
      .join(', ');
    formDataToSend.append('ingredients', ingredientsString);
    if (imageFile) formDataToSend.append('image', imageFile);

    const url = editMode
      ? `/api/dishes/update/${selectedDish.id}`
      : '/api/dishes/add';
    try {
      const response = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: formDataToSend });
      if (response.ok) { setIsModalOpen(false); fetchDishes(); setSelectedDish(null); }
    } catch (error) { alert("Backend update failed"); }
  };

  const handleDelete = async (dishId) => {
    if (window.confirm("Delete permanently?")) {
      try {
        const response = await apiFetch(`/api/dishes/delete/${dishId}`, { method: 'DELETE' });
        if (response.ok) { setSelectedDish(null); fetchDishes(); }
      } catch (error) { console.error(error); }
    }
  };

  const handleAddNew = () => {
    setEditMode(false);
    setFormData({ name: "", category: "", cost: "", profit: "", description: "", ingredients: [{ name: "", amount: "" }] });
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    setEditMode(true);
    let parsedIngredients = [{ name: "", amount: "" }];
    if (selectedDish.ingredients) {
      parsedIngredients = selectedDish.ingredients.split(',').map(item => {
        const match = item.match(/(.*)\s\((.*)\)/);
        return match ? { name: match[1].trim(), amount: match[2].trim() } : { name: item.trim(), amount: "" };
      });
    }
    setFormData({ ...selectedDish, description: selectedDish.description || "", ingredients: parsedIngredients });
    setIsModalOpen(true);
  };

  const filtered = dishes.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 relative min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menu & Recipes</h1>
          <p className="text-sm text-slate-500 mt-1">Live Database: {dishes.length} Dishes</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
          <Plus size={18} /> Add New Dish
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search dishes..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p>Connecting to Backend...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dish) => (
            <div
              key={dish.id}
              className={`group bg-white rounded-2xl border ${checkedIds.has(dish.id) ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100'} shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer relative`}
              onClick={() => setSelectedDish(dish)}
            >
              <div
                className={`absolute top-4 right-4 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checkedIds.has(dish.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white/50 backdrop-blur-md border-white'}`}
                onClick={(e) => toggleCheckbox(e, dish.id)}
              >
                {checkedIds.has(dish.id) && <Check size={14} className="text-white" />}
              </div>

              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={dish.image?.startsWith('/static') ? `${API_BASE}${dish.image}` : dish.image}
                  alt={dish.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500"; }}
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-md text-slate-900 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm">{dish.category}</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-slate-900 mb-4">{dish.name}</h3>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Cost</span>
                    <span className="font-bold text-slate-900">₹{Number(dish.cost).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Profit</span>
                    <span className="font-bold text-emerald-600">+₹{Number(dish.profit).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating NEXT Button */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4">
          <button onClick={handleNextStep} className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-2xl scale-110">
            Next ({checkedIds.size} selected) <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* ── PREPARATION QUEUE MODAL ─────────────────────────────────────── */}
      {isTimerModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsTimerModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Preparation Queue</h2>
                <p className="text-slate-400 text-sm">Review quantities · Inventory check runs automatically</p>
              </div>
              <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/20 text-center">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Expires In</p>
                <div className="flex items-center gap-2 font-mono text-2xl font-bold">
                  <Clock size={20} className="text-emerald-400" /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            {!availabilityLoading && Object.keys(availabilityData).length > 0 && (
              <div className={`px-8 py-3 text-sm font-semibold flex items-center gap-2 shrink-0 ${allCanPrepare ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {allCanPrepare
                  ? <><CheckCircle2 size={16} /> All ingredients are available — ready to proceed!</>
                  : <><ShieldAlert size={16} /> Some ingredients are insufficient — check details below</>}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {orderItems.map((item) => {
                const avail = availabilityData[item.id];
                const canPrepare = avail?.can_prepare;
                const borderColor = !avail ? 'border-slate-100' : canPrepare ? 'border-emerald-200' : 'border-red-200';
                const bgColor = !avail ? 'bg-slate-50' : canPrepare ? 'bg-emerald-50/30' : 'bg-red-50/30';

                return (
                  <div key={item.id} className={`rounded-2xl p-6 border-2 ${borderColor} ${bgColor}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-slate-900">{item.name}</h4>
                          {avail && (
                            canPrepare
                              ? <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> READY</span>
                              : <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> SHORTAGE</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-fit">
                          <Calendar size={14} className="text-slate-400" />
                          <input
                            type="date"
                            value={item.queueDate}
                            onChange={(e) => updateItemDate(item.id, e.target.value)}
                            className="text-[11px] font-bold uppercase text-slate-600 outline-none bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                        <button onClick={() => updateOrderQty(item.id, -1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><Minus size={18} /></button>
                        <span className="font-bold text-lg min-w-[20px] text-center">{item.orderQty}</span>
                        <button onClick={() => updateOrderQty(item.id, 1)} className="p-1 hover:bg-slate-100 rounded-lg text-emerald-600"><Plus size={18} /></button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {avail ? 'Inventory Check' : 'Required Ingredients (Auto-Scaled)'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {avail
                          ? avail.ingredients.map((ing, i) => (
                              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${ing.ok ? 'bg-emerald-50 border-emerald-100 text-slate-700' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                {ing.ok
                                  ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                  : <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                                <span>{ing.name}</span>
                                <span className={`font-bold ${ing.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {ing.needed.toFixed(1)}{ing.unit}
                                </span>
                                {!ing.ok && (
                                  <span className="text-[10px] text-red-500 ml-1">
                                    (only {ing.available.toFixed(1)}{ing.unit})
                                  </span>
                                )}
                              </div>
                            ))
                          : item.parsedIngs.map((ing, i) => (
                              <div key={i} className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                                <span className="text-xs font-medium text-slate-700">{ing.name}</span>
                                <span className="text-xs font-bold text-slate-500">{(ing.val * item.orderQty).toFixed(1)}{ing.unit}</span>
                              </div>
                            ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
              <button onClick={() => setIsTimerModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-200 rounded-2xl transition-colors">Cancel</button>
              <button
                onClick={handleRedirectToBilling}
                disabled={!allCanPrepare && Object.keys(availabilityData).length > 0}
                className={`flex-[2] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${allCanPrepare || Object.keys(availabilityData).length === 0 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {allCanPrepare || Object.keys(availabilityData).length === 0
                  ? <><span>Confirm Preparation & Billing</span><ArrowRight size={20} /></>
                  : <><ShieldAlert size={18} /><span>Fix Stock Shortages First</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT DISH MODAL ───────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{editMode ? "Edit Dish" : "Add New Dish"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSave}>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Dish Name" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Category" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} placeholder="Cost" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
                <input type="number" value={formData.profit} onChange={(e) => setFormData({ ...formData, profit: e.target.value })} placeholder="Profit" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl h-24" />

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  Ingredients
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-1">saved to recipe</span>
                </p>
                <div className="space-y-2">
                  {formData.ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input type="text" placeholder="Ingredient name" value={ing.name} onChange={(e) => updateIngredient(index, 'name', e.target.value)} className="flex-[2] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                      <input type="text" placeholder="e.g. 200g" value={ing.amount} onChange={(e) => updateIngredient(index, 'amount', e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                      <button type="button" onClick={() => removeIngredientRow(index)} className="p-2 text-red-400"><Minus size={16} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Plus size={14} /> Add Ingredient</button>
                </div>
              </div>

              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                <span className="text-xs text-slate-400">{imageFile ? imageFile.name : "Upload Image"}</span>
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Save to Database</button>
            </form>
          </div>
        </div>
      )}

      {/* ── SIDE PANEL ──────────────────────────────────────────────────── */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDish(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div className="relative h-64 shrink-0">
              <img src={selectedDish.image?.startsWith('/static') ? `${API_BASE}${selectedDish.image}` : selectedDish.image} alt={selectedDish.name} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedDish(null)} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white"><X size={20} /></button>
              <div className="absolute bottom-0 p-6">
                <h2 className="text-2xl font-bold text-white">{selectedDish.name}</h2>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-bold text-slate-400">Cost</p><p className="text-lg font-bold">₹{Number(selectedDish.cost).toFixed(2)}</p></div>
                <div className="bg-emerald-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-bold text-emerald-600">Profit</p><p className="text-lg font-bold text-emerald-700">₹{Number(selectedDish.profit).toFixed(2)}</p></div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Recipe Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDish.ingredients
                    ? selectedDish.ingredients.split(',').map((ing, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{ing.trim()}</span>
                      ))
                    : <span className="text-slate-400 text-sm">No ingredients.</span>}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button onClick={handleEditClick} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Pencil size={18} /> Edit</button>
              <button onClick={() => handleDelete(selectedDish.id)} className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold"><Trash2 size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}