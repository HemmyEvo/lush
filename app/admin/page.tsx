"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Trash2, Plus, Save, ArrowLeft, Loader2, Tag, 
  BarChart3, LayoutList, TrendingUp, DollarSign, Calendar
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "analytics">("inventory");
  
  // Data
  const products = useQuery(api.products.get);
  const completedOrders = useQuery(api.orders.getCompleted);
  const addProduct = useMutation(api.products.add);
  const deleteProduct = useMutation(api.products.remove);

  // --- ANALYTICS CALCULATIONS ---
  const stats = useMemo(() => {
    if (!completedOrders) return { revenue: 0, count: 0, topProduct: "N/A" };
    
    let revenue = 0;
    const productCounts: Record<string, number> = {};

    completedOrders.forEach(order => {
      revenue += order.totalAmount;
      order.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    const topProduct = Object.entries(productCounts).sort((a,b) => b[1] - a[1])[0];

    return {
      revenue,
      count: completedOrders.length,
      topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]} sold)` : "No Sales Yet"
    };
  }, [completedOrders]);


  // --- INVENTORY STATE ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive Categories
  const existingCategories = useMemo(() => {
    if (!products) return ["Parfait", "Smoothie"];
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;
    setIsSubmitting(true);
    await addProduct({ name, price: Number(price), category });
    setName(""); setPrice(""); setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20 selection:bg-pink-500/30">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-zinc-900 to-transparent opacity-50" />
      </div>

      {/* HEADER */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-zinc-800 p-2 rounded-lg border border-white/10"><Tag className="w-5 h-5"/></div>
             <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10 self-start md:self-auto">
             <button onClick={() => setActiveTab("inventory")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === "inventory" ? "bg-zinc-700 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>
                <LayoutList className="w-4 h-4" /> Inventory
             </button>
             <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === "analytics" ? "bg-pink-900/30 text-pink-400 border border-pink-500/30 shadow" : "text-zinc-500 hover:text-zinc-300"}`}>
                <BarChart3 className="w-4 h-4" /> Reports & Sales
             </button>
          </div>

          <Link href="/"><button className="px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5">Exit</button></Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 relative z-10">
        
        {/* ===================== TAB 1: INVENTORY ===================== */}
        {activeTab === "inventory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Add Form */}
             <div className="lg:col-span-1 bg-zinc-900/40 border border-white/10 rounded-2xl p-6 h-fit">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-zinc-400"/> Add Item</h2>
                <form onSubmit={handleAddProduct} className="space-y-4">
                   <div className="space-y-1"><label className="text-xs uppercase text-zinc-500 font-bold">Name</label><input className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white outline-none" placeholder="Item Name" value={name} onChange={e=>setName(e.target.value)} required /></div>
                   <div className="space-y-1"><label className="text-xs uppercase text-zinc-500 font-bold">Price</label><input type="number" className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white outline-none" placeholder="5000" value={price} onChange={e=>setPrice(e.target.value)} required /></div>
                   <div className="space-y-1"><label className="text-xs uppercase text-zinc-500 font-bold">Category</label><input className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white outline-none" placeholder="Select or type..." value={category} onChange={e=>setCategory(e.target.value)} required />
                      <div className="flex flex-wrap gap-2 mt-2">{existingCategories.map(c => <button type="button" key={c} onClick={()=>setCategory(c)} className="text-xs bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700">{c}</button>)}</div>
                   </div>
                   <button disabled={isSubmitting} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200">{isSubmitting ? "Saving..." : "Save Product"}</button>
                </form>
             </div>

             {/* List */}
             <div className="lg:col-span-2 bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5"><h2 className="font-bold">Menu Items ({products?.length || 0})</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/20 text-xs text-zinc-500 uppercase">
                       <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {products?.map(p => (
                          <tr key={p._id} className="hover:bg-white/5">
                             <td className="px-6 py-4">{p.name}</td>
                             <td className="px-6 py-4"><span className="bg-zinc-800 text-xs px-2 py-1 rounded">{p.category}</span></td>
                             <td className="px-6 py-4 font-mono">₦{p.price.toLocaleString()}</td>
                             <td className="px-6 py-4 text-right"><button onClick={()=>deleteProduct({id: p._id})} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                          </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {/* ===================== TAB 2: ANALYTICS ===================== */}
        {activeTab === "analytics" && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/20 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2 text-green-400"><DollarSign className="w-5 h-5"/> <h3 className="font-bold uppercase text-xs tracking-wider">Total Revenue</h3></div>
                    <div className="text-3xl font-bold text-white">₦{stats.revenue.toLocaleString()}</div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/20 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2 text-blue-400"><TrendingUp className="w-5 h-5"/> <h3 className="font-bold uppercase text-xs tracking-wider">Total Orders</h3></div>
                    <div className="text-3xl font-bold text-white">{stats.count}</div>
                 </div>

                 <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2 text-purple-400"><Tag className="w-5 h-5"/> <h3 className="font-bold uppercase text-xs tracking-wider">Top Product</h3></div>
                    <div className="text-2xl font-bold text-white truncate">{stats.topProduct}</div>
                 </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-zinc-500"/> Sales History</h2>
                    <span className="text-xs text-zinc-500">Showing last 100 orders</span>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-black/20 text-xs text-zinc-500 uppercase font-bold">
                          <tr>
                             <th className="px-6 py-4">Date/Time</th>
                             <th className="px-6 py-4">Customer</th>
                             <th className="px-6 py-4">Items</th>
                             <th className="px-6 py-4 text-right">Amount</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {!completedOrders || completedOrders.length === 0 ? (
                             <tr><td colSpan={4} className="text-center py-10 text-zinc-500">No sales recorded yet.</td></tr>
                          ) : (
                             completedOrders.map(order => (
                                <tr key={order._id} className="hover:bg-white/5 transition">
                                   <td className="px-6 py-4 text-zinc-400 text-sm">
                                      {new Date(order.createdAt).toLocaleDateString()} <span className="text-zinc-600">|</span> {new Date(order.createdAt).toLocaleTimeString()}
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="font-bold text-white text-sm">{order.customerName}</div>
                                      <div className="text-xs text-zinc-500 truncate max-w-[150px]">{order.customerAddress}</div>
                                   </td>
                                   <td className="px-6 py-4 text-sm text-zinc-300">
                                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                                   </td>
                                   <td className="px-6 py-4 text-right font-mono text-green-400 font-bold">
                                      ₦{order.totalAmount.toLocaleString()}
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

           </div>
        )}

      </main>
    </div>
  );
}