/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search, ShoppingCart, Plus, Minus, Trash2, ChefHat, User, MapPin, X } from "lucide-react";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const products = useQuery(api.products.get);
  const createOrder = useMutation(api.orders.create);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCheckout, setShowCheckout] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerType, setCustomerType] = useState<"DELIVERY" | "WALK_IN">("DELIVERY");
  const [salesManager, setSalesManager] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    if (!products) return ["All"];
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product._id);
      if (existing) return prev.map((item) => (item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
      return [...prev, { id: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || (customerType === "DELIVERY" && !customerAddress)) return;
    setIsSubmitting(true);

    try {
      await createOrder({
        customerName,
        customerType,
        customerAddress: customerAddress || undefined,
        salesManager: salesManager || undefined,
        items: cart.map((item) => ({ id: item.id as any, name: item.name, quantity: item.quantity, price: item.price })),
        totalAmount: cartTotal,
      });

      setCart([]);
      setCustomerName("");
      setCustomerAddress("");
      setSalesManager("");
      setCustomerType("DELIVERY");
      setShowCheckout(false);
      alert("Order Sent to Assistant! ✅");
    } catch (error) {
      console.error(error);
      alert("Error sending order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden relative">
      {showCheckout && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><ChefHat className="text-pink-500" /> Confirm Order</h2><button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCustomerType("DELIVERY")} className={`py-2 rounded-lg text-sm ${customerType === "DELIVERY" ? "bg-white text-black" : "bg-zinc-800"}`}>Delivery</button>
                <button type="button" onClick={() => setCustomerType("WALK_IN")} className={`py-2 rounded-lg text-sm ${customerType === "WALK_IN" ? "bg-white text-black" : "bg-zinc-800"}`}>Walk-in</button>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Customer Name</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10" /></div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">{customerType === "DELIVERY" ? "Delivery Address" : "Walk-in Note (optional)"}</label>
                <div className="relative"><MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" /><textarea required={customerType === "DELIVERY"} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 h-20 resize-none" /></div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Sales manager handling this customer? (optional)</label>
                <input value={salesManager} onChange={(e) => setSalesManager(e.target.value)} placeholder="e.g. Aisha" className="w-full bg-black border border-zinc-700 rounded-lg p-3" />
              </div>

              <div className="bg-zinc-800/50 p-4 rounded-lg flex justify-between"><span>Total:</span><span className="font-bold">₦{cartTotal.toLocaleString()}</span></div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-pink-600 py-3 rounded-xl font-bold disabled:opacity-50">{isSubmitting ? "Sending..." : "Confirm & Send"}</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="p-4 border-b border-white/10 flex justify-between items-center"><h1 className="text-xl font-bold">Sales Terminal</h1><Link href="/"><button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm">Exit</button></Link></header>
        <div className="p-4 space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-10" /></div><div className="flex gap-2 overflow-x-auto pb-2">{categories.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm border ${activeCategory === cat ? "bg-white text-black" : "border-zinc-800 text-zinc-400"}`}>{cat}</button>)}</div></div>
        <div className="flex-1 overflow-y-auto p-4 pb-20"><div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{filteredProducts.map((p) => <button key={p._id} onClick={() => addToCart(p)} className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl text-left"><div className="text-xs text-zinc-500 uppercase">{p.category}</div><div className="font-bold text-lg mb-2">{p.name}</div><div className="flex justify-between"><span>₦{p.price.toLocaleString()}</span><Plus className="w-4 h-4" /></div></button>)}</div></div>
      </div>

      <div className="w-full md:w-[400px] bg-zinc-900 border-l border-white/10 flex flex-col h-[40vh] md:h-screen">
        <div className="p-6 border-b border-white/5"><h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Order</h2></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{cart.map((item) => <div key={item.id} className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center"><div><div className="font-medium">{item.name}</div><div className="text-sm text-zinc-500">₦{item.price.toLocaleString()}</div></div><div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1"><button onClick={() => setCart((prev) => prev.map((x) => x.id === item.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))} className="p-1"><Minus className="w-4 h-4" /></button><span className="w-4 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => setCart((prev) => prev.map((x) => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))} className="p-1"><Plus className="w-4 h-4" /></button></div><button onClick={() => setCart((prev) => prev.filter((x) => x.id !== item.id))} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>)}</div>
        <div className="p-6 border-t border-white/10 space-y-4"><div className="flex justify-between text-2xl font-bold"><span>Total</span><span>₦{cartTotal.toLocaleString()}</span></div><button onClick={() => cart.length > 0 && setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-white text-black py-4 rounded-xl font-bold disabled:opacity-50">Proceed to Checkout</button></div>
      </div>
    </div>
  );
}
