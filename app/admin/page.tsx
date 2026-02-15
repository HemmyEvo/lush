"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trash2, Plus, Tag, BarChart3, LayoutList, TrendingUp, DollarSign, Calendar, Download } from "lucide-react";
import Link from "next/link";
import { exportToCsv } from "@/lib/exportToCsv";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "analytics">("inventory");

  const products = useQuery(api.products.get);
  const completedOrders = useQuery(api.orders.getCompleted);
  const allOrders = useQuery(api.orders.getAll);
  const riders = useQuery(api.riders.list);

  const addProduct = useMutation(api.products.add);
  const deleteProduct = useMutation(api.products.remove);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const stats = useMemo(() => {
    if (!completedOrders) return { revenue: 0, count: 0, topProduct: "N/A" };
    let revenue = 0;
    const productCounts: Record<string, number> = {};

    completedOrders.forEach((order) => {
      revenue += order.totalAmount;
      order.items.forEach((item) => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    const top = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
    return { revenue, count: completedOrders.length, topProduct: top ? `${top[0]} (${top[1]} sold)` : "No Sales Yet" };
  }, [completedOrders]);

  const existingCategories = useMemo(() => {
    if (!products) return ["Parfait", "Smoothie"];
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;
    await addProduct({ name, price: Number(price), category });
    setName("");
    setPrice("");
  };

  const downloadAdminExport = () => {
    exportToCsv(
      "admin-full-details",
      ["Type", "ID", "Name/Customer", "Phone", "Company", "Category/Status", "Amount", "Items", "Address", "Sales Manager", "Created At"],
      [
        ...(products ?? []).map((p) => ["Product", p._id, p.name, "", "", p.category, p.price, "", "", "", ""]),
        ...(riders ?? []).map((r) => ["Rider", r._id, r.name, r.phone, r.companyName, r.isActive ? "Active" : "Inactive", "", "", "", "", new Date(r.createdAt).toLocaleString()]),
        ...(allOrders ?? []).map((o) => [
          "Order",
          o._id,
          o.customerName,
          o.riderPhone,
          o.riderCompanyName,
          `${o.customerType} / ${o.status}`,
          o.totalAmount,
          o.items.map((item) => `${item.quantity}x ${item.name}`).join(" | "),
          o.customerAddress,
          o.salesManager,
          new Date(o.createdAt).toLocaleString(),
        ]),
      ],
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3"><div className="bg-zinc-800 p-2 rounded-lg border border-white/10"><Tag className="w-5 h-5" /></div><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10 self-start md:self-auto">
            <button onClick={() => setActiveTab("inventory")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === "inventory" ? "bg-zinc-700" : "text-zinc-500"}`}><LayoutList className="w-4 h-4" /> Inventory</button>
            <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === "analytics" ? "bg-pink-900/30 text-pink-400" : "text-zinc-500"}`}><BarChart3 className="w-4 h-4" /> Reports & Sales</button>
          </div>
          <div className="flex gap-2"><button onClick={downloadAdminExport} className="px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5 flex items-center gap-2"><Download className="w-4 h-4" /> Download all details</button><Link href="/"><button className="px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5">Exit</button></Link></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === "inventory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-zinc-900/40 border border-white/10 rounded-2xl p-6 h-fit">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-zinc-400" /> Add Item</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input className="w-full bg-black border border-zinc-700 rounded-lg p-3" placeholder="Item Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input type="number" className="w-full bg-black border border-zinc-700 rounded-lg p-3" placeholder="5000" value={price} onChange={(e) => setPrice(e.target.value)} required />
                <input className="w-full bg-black border border-zinc-700 rounded-lg p-3" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
                <div className="flex flex-wrap gap-2">{existingCategories.map((c) => <button type="button" key={c} onClick={() => setCategory(c)} className="text-xs bg-zinc-800 px-2 py-1 rounded">{c}</button>)}</div>
                <button className="w-full py-3 rounded-lg bg-white text-black font-bold">Add Product</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5"><h2 className="font-bold">Menu Items ({products?.length || 0})</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left"><thead className="bg-black/20 text-xs text-zinc-500 uppercase"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-white/5">{products?.map((p) => <tr key={p._id}><td className="px-6 py-4">{p.name}</td><td className="px-6 py-4">{p.category}</td><td className="px-6 py-4">₦{p.price.toLocaleString()}</td><td className="px-6 py-4 text-right"><button onClick={() => deleteProduct({ id: p._id })}><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/20 p-6 rounded-2xl"><div className="flex items-center gap-2 text-green-400 mb-2"><DollarSign className="w-5 h-5" />Total Revenue</div><div className="text-3xl font-bold">₦{stats.revenue.toLocaleString()}</div></div>
              <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/20 p-6 rounded-2xl"><div className="flex items-center gap-2 text-blue-400 mb-2"><TrendingUp className="w-5 h-5" />Total Orders</div><div className="text-3xl font-bold">{stats.count}</div></div>
              <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 p-6 rounded-2xl"><div className="flex items-center gap-2 text-purple-400 mb-2"><Tag className="w-5 h-5" />Top Product</div><div className="text-2xl font-bold truncate">{stats.topProduct}</div></div>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between"><h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5" /> Sales History</h2><span className="text-xs text-zinc-500">Showing last 100 orders</span></div>
              <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-black/20 text-xs text-zinc-500 uppercase"><tr><th className="px-6 py-4">Date/Time</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Items</th><th className="px-6 py-4 text-right">Amount</th></tr></thead><tbody>{!completedOrders || completedOrders.length === 0 ? <tr><td colSpan={4} className="text-center py-10 text-zinc-500">No sales recorded yet.</td></tr> : completedOrders.map((order) => <tr key={order._id} className="border-t border-white/5"><td className="px-6 py-4">{new Date(order.createdAt).toLocaleString()}</td><td className="px-6 py-4">{order.customerName}</td><td className="px-6 py-4">{order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</td><td className="px-6 py-4 text-right">₦{order.totalAmount.toLocaleString()}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
