import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Package, AlertTriangle, CheckCircle2, Filter, X, Trash2, Edit3, IndianRupee, User, Mail 
} from "lucide-react";
import { apiFetch } from "../api";

// --- INLINED UI COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`flex flex-col rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm transition-all hover:shadow-md ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, className = "" }) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, className = "", variant = "default", type = "button" }) => {
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
    ghost: "hover:bg-slate-100 text-slate-600"
  };
  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ ...props }) => (
  <input {...props} className={`flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.className}`} />
);

const Progress = ({ value, indicatorColor = "bg-emerald-500" }) => (
  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full transition-all duration-500 ${indicatorColor}`} style={{ width: `${value}%` }} />
  </div>
);

// --- MAIN INVENTORY LOGIC ---
export default function InventoryPage() {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [formData, setFormData] = useState({ 
    name: "", stock: "", unit: "kg", threshold: "", max: "", price: "", 
    supplier_name: "", supplier_email: "" 
  });

  const fetchInventory = async () => {
    try {
      const response = await apiFetch('/api/inventory/');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const getStatus = (stock, threshold) => {
    if (stock <= threshold * 0.3) return "critical";
    if (stock <= threshold) return "low";
    return "ok";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingItem;
    const url = isEdit 
      ? `/api/inventory/update/${editingItem.id}` 
      : '/api/inventory/add';
    
    const method = isEdit ? "PUT" : "POST";
    
    const payload = { 
      name: formData.name,
      unit: formData.unit,
      stock: parseFloat(formData.stock), 
      threshold: parseFloat(formData.threshold), 
      max: parseFloat(formData.max),
      price: parseFloat(formData.price || 0),
      supplier_name: formData.supplier_name,
      supplier_email: formData.supplier_email
    };

    try {
      const response = await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        closeModal();
        fetchInventory();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to save item. Please try again.");
        closeModal();
        fetchInventory();
      }
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Cannot connect to server. Make sure Flask is running!");
      closeModal();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        const response = await apiFetch(`/api/inventory/delete/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setIngredients(ingredients.filter(item => item.id !== id));
        }
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ 
      name: item.name, 
      stock: item.stock, 
      unit: item.unit, 
      threshold: item.threshold, 
      max: item.max,
      price: item.price || "",
      supplier_name: item.supplier_name || "",
      supplier_email: item.supplier_email || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ 
      name: "", stock: "", unit: "kg", threshold: "", max: "", price: "", 
      supplier_name: "", supplier_email: "" 
    });
  };

  const filtered = ingredients
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => filterLow ? (getStatus(i.stock, i.threshold) !== "ok") : true);

  const lowCount = ingredients.filter(i => getStatus(i.stock, i.threshold) !== "ok").length;

  return (
    <div className="flex flex-col gap-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500">Track stock levels and manage ingredients.</p>
        </div>
        <Button onClick={() => { setEditingItem(null); setFormData({ name: "", stock: "", unit: "kg", threshold: "", max: "", price: "", supplier_name: "", supplier_email: "" }); setIsModalOpen(true); }} className="rounded-xl h-11 px-5 shadow-sm">
          <Plus className="size-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none bg-emerald-50/50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="bg-emerald-600 p-2 rounded-lg text-white"><Package size={20}/></div>
            <div><p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Items</p><p className="text-2xl font-bold text-emerald-900">{ingredients.length}</p></div>
          </CardContent>
        </Card>
        
        <Card className="border-none bg-red-50/50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="bg-red-600 p-2 rounded-lg text-white"><AlertTriangle size={20}/></div>
            <div><p className="text-xs font-semibold text-red-800 uppercase tracking-wider">Low Stock</p><p className="text-2xl font-bold text-red-900">{lowCount}</p></div>
          </CardContent>
        </Card>

        <Card className="border-none bg-slate-50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="bg-slate-600 p-2 rounded-lg text-white"><CheckCircle2 size={20}/></div>
            <div><p className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Healthy</p><p className="text-2xl font-bold text-slate-900">{ingredients.length - lowCount}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm" />
        </div>
        <Button variant={filterLow ? "default" : "outline"} onClick={() => setFilterLow(!filterLow)} className={`h-11 rounded-xl ${filterLow ? "bg-red-600 border-red-600" : ""}`}>
          <Filter className="size-4 mr-2" /> {filterLow ? "Alerts Active" : "Filter Alerts"}
        </Button>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const status = getStatus(item.stock, item.threshold);
          const percentage = Math.min((item.stock / item.max) * 100, 100);
          const color = status === "critical" ? "bg-red-500" : status === "low" ? "bg-amber-500" : "bg-emerald-500";

          return (
            <Card key={item.id || item.name} className={status !== "ok" ? "ring-2 ring-red-100" : ""}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                      <IndianRupee size={12} />
                      <span>{item.price || "0"}</span>
                      <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={status === "ok" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                      {status}
                    </Badge>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(item)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition-colors">
                        <Edit3 size={14}/>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${status !== 'ok' ? 'text-red-600' : 'text-slate-900'}`}>{item.stock}</span>
                  <span className="text-sm font-bold text-slate-500">{item.unit}</span>
                </div>

                {/* Supplier Info Display */}
                {(item.supplier_name || item.supplier_email) && (
                  <div className="pt-2 border-t border-slate-50 space-y-1">
                    {item.supplier_name && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <User size={10} className="text-slate-400" />
                        <span className="font-medium truncate">{item.supplier_name}</span>
                      </div>
                    )}
                    {item.supplier_email && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Mail size={10} className="text-slate-400" />
                        <span className="truncate italic">{item.supplier_email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Progress value={percentage} indicatorColor={color} />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>{Math.round(percentage)}% STOCK</span>
                    <span>MAX CAPACITY: {item.max}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingItem ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input required placeholder="Ingredient Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <Input required type="number" step="0.01" className="pl-8" placeholder="Price (₹)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <select className="border border-slate-200 rounded-md px-3 text-sm h-10 bg-white" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                  <option value="kg">kg</option><option value="L">L</option><option value="units">units</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input required type="number" step="0.1" placeholder="Current Stock" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                <Input required type="number" step="0.1" placeholder="Capacity" value={formData.max} onChange={e => setFormData({...formData, max: e.target.value})} />
              </div>
              <div className="grid grid-cols-1">
                <Input required type="number" step="0.1" placeholder="Min Alert" value={formData.threshold} onChange={e => setFormData({...formData, threshold: e.target.value})} />
              </div>
              
              {/* Supplier Section in Modal */}
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  placeholder="Supplier Name" 
                  value={formData.supplier_name} 
                  onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} 
                />
                <Input 
                  type="email" 
                  placeholder="Supplier Email" 
                  value={formData.supplier_email} 
                  onChange={(e) => setFormData({...formData, supplier_email: e.target.value})} 
                />
              </div>
              
              <Button type="submit" className="w-full py-6 text-lg rounded-xl shadow-lg shadow-emerald-100">
                {editingItem ? "Update Item" : "Add to Inventory"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}