/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  ChefHat, 
  Truck, 
  ArrowLeft,
  Bell, 
  BellOff,
  AlertCircle,
  Package,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function AssistantPage() {
  // --- 1. DATA FETCHING ---
  const newOrders = useQuery(api.orders.getByStatus, { status: "NEW" });
  const readyOrders = useQuery(api.orders.getByStatus, { status: "READY" });
  const updateStatus = useMutation(api.orders.updateStatus);

  // --- 2. MOBILE TABS STATE ---
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  // --- 3. NOTIFICATION LOGIC ---
  const [permission, setPermission] = useState("default");
  const prevOrderCount = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Browser does not support notifications");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!newOrders) return;
    if (newOrders.length > prevOrderCount.current) {
      const audio = new Audio("/sounds/ding.mp3");
      audio.play().catch(e => console.log(e));
      
      if (permission === "granted") {
        new Notification("New Order! 🍧", { body: "Check Incoming tab." });
      }
    }
    prevOrderCount.current = newOrders.length;
  }, [newOrders, permission]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-zinc-900 rounded-full blur-[100px] opacity-30" />
      </div>

      {/* --- HEADER --- */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Assistant</h1>
            
            {/* Notification Button (Icon Only on Mobile) */}
            {permission !== "granted" ? (
              <button onClick={requestPermission} className="bg-pink-600 p-2 rounded-full animate-pulse">
                <BellOff className="w-4 h-4 text-white" />
              </button>
            ) : (
              <div className="bg-green-900/20 p-2 rounded-full border border-green-900/50">
                 <Bell className="w-4 h-4 text-green-400" />
              </div>
            )}
          </div>

          <Link href="/">
             <button className="px-3 py-1.5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10">
               Exit
             </button>
          </Link>
        </div>

        {/* --- MOBILE TABS (Visible only on Mobile < lg) --- */}
        <div className="lg:hidden grid grid-cols-2 p-2 gap-2 border-t border-white/5">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${activeTab === "incoming" 
                ? "bg-zinc-800 text-white shadow-lg" 
                : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <AlertCircle className={`w-4 h-4 ${activeTab === "incoming" ? "text-pink-500" : ""}`} />
            Incoming
            {newOrders && newOrders.length > 0 && (
              <span className="bg-pink-600 text-white text-[10px] px-1.5 rounded-full ml-1">
                {newOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("outgoing")}
            className={`py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${activeTab === "outgoing" 
                ? "bg-zinc-800 text-white shadow-lg" 
                : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Package className={`w-4 h-4 ${activeTab === "outgoing" ? "text-blue-500" : ""}`} />
            Ready
            {readyOrders && readyOrders.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full ml-1">
                {readyOrders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 max-w-7xl mx-auto p-4 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20 lg:pb-6 relative z-10">
        
        {/* ================= INCOMING COLUMN ================= */}
        {/* Logic: Hidden on mobile unless activeTab is 'incoming'. Always block on Desktop (lg:block). */}
        <section className={`
            flex flex-col h-full bg-zinc-900/30 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-md
            ${activeTab === "incoming" ? "block" : "hidden lg:block"}
        `}>
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-pink-900/10 to-transparent flex justify-between items-center sticky top-0 bg-black/50 backdrop-blur-md z-10">
            <h2 className="font-bold flex items-center gap-2 text-pink-100">
              Incoming Orders
            </h2>
            <span className="bg-pink-600 text-white px-2 py-0.5 rounded text-xs font-bold">
              {newOrders ? newOrders.length : 0}
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {!newOrders || newOrders.length === 0 ? (
              <EmptyState text="No pending orders" />
            ) : (
              newOrders.map(order => (
                <div key={order._id} className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-zinc-500 font-mono">#{order._id.slice(-4)}</span>
                    <span className="text-sm font-bold text-white">₦{order.totalAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-1">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm text-zinc-300">
                        <span>{item.name}</span>
                        <span className="text-pink-500 font-bold">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => updateStatus({ id: order._id, status: "IN_PROGRESS" })}
                    className="w-full py-3 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
                  >
                    <ChefHat className="w-4 h-4" /> Send to Kitchen
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ================= OUTGOING COLUMN ================= */}
        {/* Logic: Hidden on mobile unless activeTab is 'outgoing'. Always block on Desktop (lg:block). */}
        <section className={`
            flex flex-col h-full bg-zinc-900/30 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-md
            ${activeTab === "outgoing" ? "block" : "hidden lg:block"}
        `}>
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-blue-900/10 to-transparent flex justify-between items-center sticky top-0 bg-black/50 backdrop-blur-md z-10">
            <h2 className="font-bold flex items-center gap-2 text-blue-100">
              Ready to Pack
            </h2>
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
              {readyOrders ? readyOrders.length : 0}
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {!readyOrders || readyOrders.length === 0 ? (
              <EmptyState text="Waiting for kitchen..." />
            ) : (
              readyOrders.map(order => (
                <DispatchCard 
                  key={order._id} 
                  order={order} 
                  onDispatch={(rider) => updateStatus({ id: order._id, status: "COMPLETED", riderName: rider })} 
                />
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-60">
      <div className="w-10 h-1 rounded-full bg-zinc-800" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function DispatchCard({ order, onDispatch }: { order: any, onDispatch: (rider: string) => void }) {
  const [rider, setRider] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDispatch = () => {
    if(!rider.trim()) return alert("Enter rider name");
    setLoading(true);
    onDispatch(rider);
  };

  return (
    <div className="bg-black/40 border border-blue-900/20 p-4 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
          Ready
        </span>
        <span className="text-xs text-zinc-500 font-mono">#{order._id.slice(-4)}</span>
      </div>

      <div className="space-y-1 mb-4">
        {order.items.map((item: any, i: number) => (
           <div key={i} className="text-sm text-zinc-300 flex justify-between">
             <span>{item.name}</span>
             <span className="text-blue-400 font-bold">x{item.quantity}</span>
           </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Rider Name..." 
            value={rider}
            onChange={(e) => setRider(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-lg py-2.5 pl-9 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        
        <button 
          onClick={handleDispatch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}