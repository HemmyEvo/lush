/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Volume2,
  VolumeX,
  Flame,
  FileBarChart,
  Play
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProductionPage() {
  // --- 1. DATA FETCHING ---
  // LISTEN TO "NEW" DIRECTLY (Bypassing Sales Executive)
  const newOrders = useQuery(api.orders.getByStatus, { status: "NEW" });
  // We fetch completed orders to generate the End of Day Report
  const completedOrders = useQuery(api.orders.getCompleted);
  const updateStatus = useMutation(api.orders.updateStatus);

  // --- 2. SOUND & INTERACTION STATE ---
  const [soundEnabled, setSoundEnabled] = useState(true); // Default ON
  const [hasInteracted, setHasInteracted] = useState(false); // Browser auto-play policy
  const prevOrderCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/ding.mp3");
  }, []);

  // Play sound on new order
  useEffect(() => {
    if (!newOrders) return;
    if (newOrders.length > prevOrderCount.current && hasInteracted && soundEnabled) {
      audioRef.current?.play().catch(e => console.error("Audio blocked:", e));
    }
    prevOrderCount.current = newOrders.length;
  }, [newOrders, soundEnabled, hasInteracted]);

  // --- 3. PDF REPORT GENERATION ---
  const generateDailyReport = () => {
    if (!completedOrders && !newOrders) return;
    
    const doc = new jsPDF();
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-"); // 17-02-2026
    const allOrders = [...(completedOrders || []), ...(newOrders || [])];
    
    // Filter for TODAY only
    const todaysOrders = allOrders.filter(o => 
      new Date(o._createdAt).toDateString() === today.toDateString()
    );

    // --- MATH ANALYSIS ---
    const totalRevenue = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = todaysOrders.length;
    
    // Item Frequency Analysis
    const itemCounts: Record<string, number> = {};
    let totalItemsCooked = 0;
    todaysOrders.forEach(order => {
      order.items.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        totalItemsCooked += item.quantity;
      });
    });

    // Peak Hour Analysis (for Bar Chart)
    const hourCounts = new Array(24).fill(0);
    todaysOrders.forEach(order => {
      const hour = new Date(order._createdAt).getHours();
      hourCounts[hour]++;
    });

    // --- PDF CONSTRUCTION ---
    
    // Header
    doc.setFontSize(22);
    doc.text("Kitchen Production Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${today.toLocaleDateString()}`, 14, 30);
    doc.text(`Total Orders: ${totalOrders}`, 14, 38);
    doc.text(`Total Revenue: ₦${totalRevenue.toLocaleString()}`, 14, 46);

    // 1. Item Breakdown Table
    const tableData = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a) // Sort by popularity
      .map(([name, count]) => [name, count, `${((count / totalItemsCooked) * 100).toFixed(1)}%`]);

    autoTable(doc, {
      startY: 55,
      head: [['Product Name', 'Qty Cooked', 'Share (%)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }, // Red header
    });

    // 2. Visual Bar Chart (Peak Hours)
    // We draw this manually using geometric primitives
    let finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text("Peak Ordering Hours (Orders per Hour)", 14, finalY);
    
    finalY += 10;
    const chartHeight = 60;
    const barWidth = 6;
    const maxOrders = Math.max(...hourCounts, 1); // Avoid divide by zero
    
    // Draw Axis
    doc.line(14, finalY + chartHeight, 200, finalY + chartHeight); // X axis
    doc.line(14, finalY, 14, finalY + chartHeight); // Y axis

    // Draw Bars
    hourCounts.forEach((count, hour) => {
      if (hour >= 8 && hour <= 22) { // Show active hours only (8am - 10pm) to save space
        const barHeight = (count / maxOrders) * chartHeight;
        const x = 20 + (hour - 8) * 12; 
        
        if (count > 0) {
          doc.setFillColor(255, 100, 0); // Orange bars
          doc.rect(x, finalY + chartHeight - barHeight, barWidth, barHeight, 'F');
          doc.setFontSize(8);
          doc.text(count.toString(), x + 1, finalY + chartHeight - barHeight - 2); // Value on top
        }
        
        // Hour Label
        doc.setFontSize(8);
        doc.text(`${hour}:00`, x, finalY + chartHeight + 5);
      }
    });

    // Save
    doc.save(`${dateStr}-orders.pdf`);
  };

  // --- 4. START SHIFT OVERLAY (Audio Policy) ---
  if (!hasInteracted) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center space-y-6">
        <div className="bg-orange-900/20 p-6 rounded-full animate-pulse">
          <Flame className="w-16 h-16 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Kitchen Display System</h1>
        <p className="text-zinc-400">Click below to enable sound and start orders.</p>
        <button 
          onClick={() => {
            setHasInteracted(true);
            audioRef.current?.play().catch(() => {}); // Prime the audio engine
          }}
          className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Play className="w-5 h-5" /> Start Shift
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[150px]" />
      </div>

      {/* --- HEADER --- */}
      <header className="border-b border-white/10 sticky top-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-orange-900/20 p-2 rounded-xl border border-orange-900/50">
              <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Production Line</h1>
              <p className="text-zinc-500 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                Live Feed • {newOrders ? `${newOrders.length} Pending` : "Connecting..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Sound Toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-lg border transition-all ${soundEnabled ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-700"}`}
              title="Toggle Kitchen Bell"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Report Download */}
            <button 
              onClick={generateDailyReport}
              className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors"
            >
              <FileBarChart className="w-4 h-4 text-orange-400" /> End of Day Report
            </button>

            <Link href="/">
               <button className="flex items-center gap-2 px-4 py-3 border border-white/10 rounded-lg hover:bg-white/10 text-sm transition-colors">
                 <ArrowLeft className="w-4 h-4" /> Exit
               </button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {!newOrders || newOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-600 space-y-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 animate-pulse">
               <ChefHat className="w-10 h-10 opacity-50" />
            </div>
            <h2 className="text-xl font-medium">Kitchen Clear</h2>
            <p className="text-sm opacity-50">Waiting for incoming orders from POS...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {newOrders.map((order) => (
              <KitchenTicket 
                key={order._id} 
                order={order} 
                onComplete={() => updateStatus({ id: order._id, status: "READY" })} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// --- TICKET COMPONENT ---
function KitchenTicket({ order, onComplete }: { order: any, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Update timer every minute
  useEffect(() => {
    const updateTime = () => {
      const diff = Math.floor((Date.now() - order._creationTime) / 60000);
      setElapsedMinutes(diff);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [order._creationTime]);

  // Format Creation Time (e.g., 2:30 PM)
  const createdTime = new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleComplete = () => {
    setLoading(true);
    // When this runs, status becomes READY. 
    // The AssistantPage (Sales Exec) is listening to "READY" orders, 
    // so they will get the notification automatically.
    setTimeout(() => onComplete(), 500);
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl hover:border-orange-500/50 transition-all duration-300 group animate-in fade-in zoom-in duration-300">

      {/* Ticket Header */}
      <div className={`p-4 border-b border-white/5 flex justify-between items-center 
        ${elapsedMinutes > 20 ? "bg-red-900/40" : "bg-white/5"}`}>
        <div className="flex flex-col">
           <span className="font-mono text-zinc-300 text-sm font-bold">#{order._id.slice(-4)}</span>
           <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
             {order.customerType === "WALK_IN" ? "Walk-In" : "Delivery"}
           </span>
        </div>
        <div className="text-right">
           <div className={`flex items-center justify-end gap-1 text-xs font-mono font-bold ${elapsedMinutes > 20 ? "text-red-400" : "text-green-400"}`}>
             <Clock className="w-3 h-3" /> {elapsedMinutes}m
           </div>
           <div className="text-[10px] text-zinc-500 mt-1">In: {createdTime}</div>
        </div>
      </div>

      {/* Customer / Sales Manager Info */}
      <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <p className="text-xs text-zinc-300 font-medium truncate max-w-[70%]">{order.customerName}</p>
        {order.salesManager && (
           <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
             Ref: {order.salesManager}
           </span>
        )}
      </div>

      {/* Order Items */}
      <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[300px]">
        {order.items.map((item: any, i: number) => (
           <div key={i} className="flex justify-between items-start text-sm group-hover:bg-white/5 p-1 rounded transition-colors">
             <span className="text-zinc-200 font-medium leading-tight w-[75%]">{item.name}</span>
             <span className="text-black font-bold bg-white px-2 py-0.5 rounded text-xs ml-2 shrink-0">
               x{item.quantity}
             </span>
           </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        <button 
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
             <>Mark Ready <CheckCircle2 className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
