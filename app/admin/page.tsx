/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Trash2, 
  Plus, 
  Tag, 
  BarChart3, 
  LayoutList, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download,
  FileDown
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper for display
const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "analytics">("analytics"); // Default to analytics for checking sales

  const products = useQuery(api.products.get);
  const completedOrders = useQuery(api.orders.getCompleted);
  
  const addProduct = useMutation(api.products.add);
  const deleteProduct = useMutation(api.products.remove);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  // --- STATISTICS CALCULATION ---
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
    return { 
      revenue, 
      count: completedOrders.length, 
      topProduct: top ? `${top[0]} (${top[1]})` : "No Sales Yet" 
    };
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

  // --- PDF GENERATION ---
  const downloadSalesPDF = () => {
    if (!completedOrders || completedOrders.length === 0) return alert("No sales data to export.");

    const doc = new jsPDF();
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-"); // 17-02-2026

    // 1. Header
    doc.setFontSize(20);
    doc.text("Daily Sales Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // 2. Summary Card
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 35, 180, 25, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.text(`Total Revenue: N${stats.revenue.toLocaleString()}`, 20, 48);
    doc.text(`Total Orders: ${stats.count}`, 80, 48);
    doc.text(`Top Product: ${stats.topProduct}`, 130, 48);

    // 3. Table Data
    const tableBody = completedOrders.map(order => [
      `#${order._id.slice(-4)}`,
      formatTime(order.createdAt),
      formatTime(order.productionCompletedAt),
      formatTime(order.assistantCompletedAt),
      order.customerName,
      order.items.map(i => `${i.quantity}x ${i.name}`).join(", "),
      `N${order.totalAmount.toLocaleString()}`
    ]);

    // 4. Draw Table
    autoTable(doc, {
      startY: 65,
      head: [['ID', 'In', 'Ready', 'Out', 'Customer', 'Items', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { cellWidth: 60 } // Make items column wider
      }
    });

    // 5. Save
    doc.save(`${dateStr}-sales.pdf`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 p-2 rounded-lg border border-white/10"><Tag className="w-5 h-5" /></div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10 self-start md:self-auto">
            <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === "analytics" ? "bg-white text-black" : "text-zinc-500"}`}>
               <BarChart3 className="w-4 h-4" /> Sales History
            </button>
            <button onClick={() => setActiveTab("inventory")} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === "inventory" ? "bg-white text-black" : "text-zinc-500"}`}>
               <LayoutList className="w-4 h-4" /> Inventory
            </button>
          </div>

          <div className="flex gap-2">
            {activeTab === "analytics" && (
               <button onClick={downloadSalesPDF} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm flex items-center gap-2">
                 <FileDown className="w-4 h-4" /> Download Report (PDF)
               </button>
            )}
            <Link href="/">
              <button className="px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5">Exit</button>
            </Link>
          </div>
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
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/60 border border-green-900/30 p-6 rounded-2xl">
                 <div className="flex items-center gap-2 text-green-400 mb-2 font-mono text-sm uppercase"><DollarSign className="w-4 h-4" /> Total Revenue</div>
                 <div className="text-3xl font-bold">₦{stats.revenue.toLocaleString()}</div>
              </div>
              <div className="bg-zinc-900/60 border border-blue-900/30 p-6 rounded-2xl">
                 <div className="flex items-center gap-2 text-blue-400 mb-2 font-mono text-sm uppercase"><TrendingUp className="w-4 h-4" /> Total Orders</div>
                 <div className="text-3xl font-bold">{stats.count}</div>
              </div>
              <div className="bg-zinc-900/60 border border-purple-900/30 p-6 rounded-2xl">
                 <div className="flex items-center gap-2 text-purple-400 mb-2 font-mono text-sm uppercase"><Tag className="w-4 h-4" /> Best Seller</div>
                 <div className="text-xl font-bold truncate" title={stats.topProduct}>{stats.topProduct}</div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5" /> Full Sales History</h2>
                   <p className="text-sm text-zinc-500">Download the PDF report before starting a new business day.</p>
                </div>
                <button onClick={downloadSalesPDF} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                   <Download className="w-3 h-3" /> Export PDF
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/40 text-xs text-zinc-400 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Time In</th>
                      <th className="px-6 py-4">Ready At</th>
                      <th className="px-6 py-4">Completed</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {!completedOrders || completedOrders.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-zinc-500">No completed sales yet.</td></tr>
                    ) : completedOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-500">#{order._id.slice(-4)}</td>
                        <td className="px-6 py-4 text-zinc-300">{formatTime(order.createdAt)}</td>
                        <td className="px-6 py-4 text-zinc-300">{formatTime(order.productionCompletedAt)}</td>
                        <td className="px-6 py-4 text-zinc-300">{formatTime(order.assistantCompletedAt)}</td>
                        <td className="px-6 py-4 font-medium">{order.customerName}</td>
                        <td className="px-6 py-4 text-zinc-400 max-w-xs truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">₦{order.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
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
