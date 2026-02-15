/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, 
  ChefHat, User, MapPin, X
} from "lucide-react";
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
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived State
  const categories = useMemo(() => {
    if (!products) return ["All"];
    const cats = new Set(products.map(p => p.category));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Actions
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product._id);
      if (existing) {
        return prev.map(item => item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerAddress) return;
    setIsSubmitting(true);

    try {
      await createOrder({
        customerName,
        customerAddress,
        items: cart.map(item => ({
          id: item.id as any,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: cartTotal,
      });

      // Reset everything
      setCart([]);
      setCustomerName("");
      setCustomerAddress("");
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
      
      {/* --- CHECKOUT MODAL OVERLAY --- */}
      {showCheckout && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChefHat className="text-pink-500" /> Confirm Order
              </h2>
              <button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Delivery Address / Note</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <textarea 
                    required
                    placeholder="e.g. Room 205, Hostel A..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-pink-500 focus:outline-none h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-zinc-800/50 p-4 rounded-lg flex justify-between items-center mb-4">
                <span className="text-zinc-400">Total to Pay:</span>
                <span className="text-xl font-bold text-white">₦{cartTotal.toLocaleString()}</span>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Sending..." : "Confirm & Send to Kitchen"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ... (Menu and Header sections remain similar to previous, simplified here for length) ... */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
         {/* HEADER */}
         <header className="p-4 border-b border-white/10 bg-black/50 flex justify-between items-center z-10">
            <div>
               <h1 className="text-xl font-bold">Sales Terminal</h1>
            </div>
            <Link href="/"><button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm">Exit</button></Link>
         </header>

         {/* FILTERS */}
         <div className="p-4 z-10 space-y-4">
             <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                 <input type="text" placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-10 text-white" />
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {categories.map(cat => (
                     <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium border ${activeCategory === cat ? "bg-white text-black" : "border-zinc-800 text-zinc-400"}`}>{cat}</button>
                 ))}
             </div>
         </div>

         {/* GRID */}
         <div className="flex-1 overflow-y-auto p-4 z-10 pb-20">
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                   <button key={p._id} onClick={() => addToCart(p)} className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl text-left hover:bg-zinc-800/60 transition">
                      <div className="text-xs text-zinc-500 uppercase">{p.category}</div>
                      <div className="font-bold text-lg mb-2">{p.name}</div>
                      <div className="flex justify-between items-center">
                          <span className="text-zinc-400">₦{p.price.toLocaleString()}</span>
                          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><Plus className="w-4 h-4" /></div>
                      </div>
                   </button>
                ))}
             </div>
         </div>
      </div>

      {/* ... CART SIDEBAR ... */}
      <div className="w-full md:w-[400px] bg-zinc-900 border-l border-white/10 flex flex-col h-[40vh] md:h-screen z-20 shadow-2xl">
         <div className="p-6 border-b border-white/5"><h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5"/> Order</h2></div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.map(item => (
                 <div key={item.id} className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                     <div><div className="font-medium">{item.name}</div><div className="text-sm text-zinc-500">₦{item.price.toLocaleString()}</div></div>
                     <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                         <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-white text-zinc-400"><Minus className="w-4 h-4"/></button>
                         <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                         <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-white text-zinc-400"><Plus className="w-4 h-4"/></button>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                 </div>
             ))}
         </div>
         <div className="p-6 bg-zinc-900 border-t border-white/10 space-y-4">
             <div className="flex justify-between text-2xl font-bold"><span>Total</span><span>₦{cartTotal.toLocaleString()}</span></div>
             <button onClick={() => { if(cart.length > 0) setShowCheckout(true) }} disabled={cart.length === 0} className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-zinc-200 disabled:opacity-50">Proceed to Checkout</button>
         </div>
      </div>
    </div>
  );
}