/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Bell, 
  Package, 
  Truck, 
  AlertTriangle, 
  Search, 
  ThumbsDown, 
  CheckCircle2, 
  Download,
  User,
  MapPin,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { exportToCsv } from "@/lib/exportToCsv";
import useSound from "use-sound";

// --- TYPES ---
type Tab = "ready" | "logistics" | "reviews";

export default function AssistantPage() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>("ready");
  
  // Logistics Workflow State
  const [processingOrder, setProcessingOrder] = useState<any>(null);
  const [riderPhone, setRiderPhone] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderCompany, setRiderCompany] = useState("");
  const [showBadRiderWarning, setShowBadRiderWarning] = useState(false);
  const [selectedRiderReviews, setSelectedRiderReviews] = useState<string[]>([]);
  
  // Review System State
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);

  // --- DATA ---
  const readyOrders = useQuery(api.orders.getByStatus, { status: "READY" }); // Kitchen Output
  const completedOrders = useQuery(api.orders.getCompleted); // History
  const riders = useQuery(api.riders.list);

  // --- MUTATIONS ---
  const updateStatus = useMutation(api.orders.updateStatus);
  const createRider = useMutation(api.riders.create);
  const addRiderReview = useMutation(api.riders.addReview);

  // --- SOUNDS ---
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [playAlert] = useSound("/sounds/ding.mp3", { volume: 1, soundEnabled });
  const prevReadyCount = useRef(0);

  // Audio Auto-enable
  useEffect(() => {
    const unlock = () => setSoundEnabled(true);
    window.addEventListener("click", unlock, { once: true });
    return () => window.removeEventListener("click", unlock);
  }, []);

  // Notification for NEW ready orders
  useEffect(() => {
    if (!readyOrders) return;
    if (readyOrders.length > prevReadyCount.current) {
      playAlert();
      // Optional: Browser Notification logic here
    }
    prevReadyCount.current = readyOrders.length;
  }, [readyOrders, playAlert]);

  // --- HELPERS ---

  // 1. Download Logic
  const handleDownload = (type: "WALK_IN" | "DELIVERY" | "ALL") => {
    if (!completedOrders) return;
    
    let data = completedOrders;
    if (type !== "ALL") {
      data = completedOrders.filter(o => o.customerType === type);
    }

    const rows = data.map(o => [
      o._id,
      new Date(o.createdAt).toLocaleString(),
      o.customerName,
      o.customerType,
      o.customerAddress || "N/A",
      o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", "),
      o.totalAmount,
      o.riderName || "N/A",
      o.riderPhone || "N/A"
    ]);

    exportToCsv(`sales-${type.toLowerCase()}`, ["ID", "Date", "Customer", "Type", "Address", "Items", "Total", "Rider", "Rider Phone"], rows);
  };

  // 2. FIFO Sorting (Oldest First)
  const sortedReadyOrders = useMemo(() => {
    if (!readyOrders) return [];
    return [...readyOrders].sort((a, b) => a._creationTime - b._creationTime);
  }, [readyOrders]);

  // --- WORKFLOW HANDLERS ---

  // A. Start Processing Order
  const handleProcessOrder = (order: any) => {
    if (order.customerType === "WALK_IN") {
      // Walk-in: Instant Complete
      if (confirm(`Confirm handover to walk-in customer: ${order.customerName}?`)) {
        updateStatus({ id: order._id, status: "COMPLETED" });
      }
    } else {
      // Delivery: Switch to Logistics Tab
      setProcessingOrder(order);
      setRiderPhone(""); // Reset form
      setRiderName("");
      setRiderCompany("");
      setShowBadRiderWarning(false);
      setActiveTab("logistics");
    }
  };

  // B. Handle Rider Phone Input (Auto-lookup)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRiderPhone(val);
    setShowBadRiderWarning(false);

    // Check if rider exists
    const foundRider = riders?.find(r => r.phone === val);
    if (foundRider) {
      setRiderName(foundRider.name);
      setRiderCompany(foundRider.companyName || "");
      
      // CHECK REVIEWS
      if (foundRider.reviews && foundRider.reviews.length > 0) {
        setSelectedRiderReviews(foundRider.reviews);
        setShowBadRiderWarning(true);
      }
    } else {
      // New Rider
      setRiderName(""); 
      setRiderCompany(""); 
    }
  };

  // C. Submit Logistics
  const handleSubmitLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingOrder || !riderPhone || !riderName) return;

    // 1. Create or Get Rider
    // The mutation 'createRider' should return ID if exists, or create new if not
    await createRider({ 
      name: riderName, 
      phone: riderPhone, 
      companyName: riderCompany 
    });

    // 2. Update Order
    await updateStatus({
      id: processingOrder._id,
      status: "COMPLETED",
      riderName: riderName,
      riderPhone: riderPhone,
      riderCompanyName: riderCompany
    });

    // 3. Reset and Return to Queue
    setProcessingOrder(null);
    alert("Order Dispatched Successfully! 🚀");
    setActiveTab("ready");
  };

  // D. Submit Bad Review
  const handleSubmitReview = async () => {
    if (!selectedOrderForReview || !reviewReason || !selectedOrderForReview.riderId) return;
    
    await addRiderReview({
      riderId: selectedOrderForReview.riderId, // Assuming schema links order to rider ID now, or we lookup by phone
      review: `${new Date().toLocaleDateString()}: ${reviewReason} (Order #${selectedOrderForReview._id.slice(-4)})`
    });

    setReviewReason("");
    setSelectedOrderForReview(null);
    alert("Review submitted. Rider flagged.");
  };


  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      
      {/* --- HEADER --- */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Sales Executive</h1>
            <div className={`p-2 rounded-full ${soundEnabled ? "bg-green-900/20 text-green-500" : "bg-zinc-800 text-zinc-500"}`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex gap-2">
             <div className="dropdown relative group">
                <button className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm flex items-center gap-2 hover:bg-zinc-700">
                  <Download className="w-4 h-4" /> Download Records
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl hidden group-hover:block overflow-hidden">
                  <button onClick={() => handleDownload("WALK_IN")} className="block w-full text-left px-4 py-3 text-sm hover:bg-white/10">Walk-in Only</button>
                  <button onClick={() => handleDownload("DELIVERY")} className="block w-full text-left px-4 py-3 text-sm hover:bg-white/10">Delivery Only</button>
                  <button onClick={() => handleDownload("ALL")} className="block w-full text-left px-4 py-3 text-sm hover:bg-white/10 border-t border-white/10">Combined All</button>
                </div>
             </div>
             <Link href="/"><button className="px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/10">Exit</button></Link>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="max-w-7xl mx-auto px-4 pb-0 flex gap-6 border-b border-white/5 mt-4">
          <button onClick={() => setActiveTab("ready")} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "ready" ? "border-green-500 text-white" : "border-transparent text-zinc-500"}`}>
            <Package className="w-4 h-4" /> Ready Queue ({readyOrders?.length || 0})
          </button>
          <button 
             onClick={() => processingOrder && setActiveTab("logistics")} 
             disabled={!processingOrder}
             className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "logistics" ? "border-blue-500 text-white" : "border-transparent text-zinc-500"} ${!processingOrder && "opacity-50 cursor-not-allowed"}`}
          >
            <Truck className="w-4 h-4" /> Logistics Processing
          </button>
          <button onClick={() => setActiveTab("reviews")} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "reviews" ? "border-red-500 text-white" : "border-transparent text-zinc-500"}`}>
            <ThumbsDown className="w-4 h-4" /> Bad Rider Reviews
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-4 w-full">

        {/* --------------------------------------------------------------------------------
            TAB 1: READY QUEUE (FIFO)
        -------------------------------------------------------------------------------- */}
        {activeTab === "ready" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Orders are sorted by time (First In, First Out). Process the top card first.
            </div>

            {sortedReadyOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>No orders ready for pickup.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedReadyOrders.map((order, idx) => (
                  <div key={order._id} className={`relative p-6 rounded-2xl border ${idx === 0 ? "bg-zinc-900 border-green-500/50 shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]" : "bg-black/40 border-white/10 opacity-75"}`}>
                    {/* FIFO Badge */}
                    {idx === 0 && <div className="absolute -top-3 left-6 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">NEXT IN LINE</div>}
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{order.customerName}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${order.customerType === "WALK_IN" ? "bg-purple-900 text-purple-200" : "bg-blue-900 text-blue-200"}`}>
                          {order.customerType.replace("_", " ")}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-500 text-xs">#{order._id.slice(-4)}</span>
                    </div>

                    <div className="space-y-3 text-sm text-zinc-300 bg-black/20 p-3 rounded-lg border border-white/5 mb-4">
                      {order.customerType === "DELIVERY" && (
                        <div className="flex items-start gap-2">
                           <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                           <p className="leading-tight">{order.customerAddress}</p>
                        </div>
                      )}
                      <div className="border-t border-white/5 pt-2 mt-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs py-0.5">
                            <span>{item.name}</span>
                            <span className="text-zinc-500">x{item.quantity}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold mt-2 text-white">
                          <span>Total</span>
                          <span>₦{order.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleProcessOrder(order)}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${order.customerType === "WALK_IN" ? "bg-white text-black hover:bg-zinc-200" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                    >
                      {order.customerType === "WALK_IN" ? "Complete Handover" : "Assign Rider"} 
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------------------
            TAB 2: LOGISTICS PROCESSING (Delivery Only)
        -------------------------------------------------------------------------------- */}
        {activeTab === "logistics" && processingOrder && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-900/60 border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6">
                <div className="p-3 bg-blue-900/20 rounded-full text-blue-400">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Assign Logistics</h2>
                  <p className="text-zinc-400">Order for: <span className="text-white">{processingOrder.customerName}</span></p>
                </div>
              </div>

              <form onSubmit={handleSubmitLogistics} className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Filter Rider by Phone</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                      autoFocus
                      type="tel"
                      value={riderPhone}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone number..."
                      className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-12 text-lg focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Searching database automatically...</p>
                </div>

                {/* BAD RIDER WARNING */}
                {showBadRiderWarning && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-2 text-red-500 font-bold mb-2">
                      <AlertTriangle className="w-5 h-5" /> WARNING: High Risk Rider
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                      {selectedRiderReviews.map((rev, i) => <li key={i}>{rev}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Rider Name</label>
                    <input 
                      type="text"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
                      placeholder="Auto-filled or type new"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Company (Optional)</label>
                    <input 
                      type="text"
                      value={riderCompany}
                      onChange={(e) => setRiderCompany(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
                      placeholder="e.g. Kwik"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setProcessingOrder(null); setActiveTab("ready"); }}
                    className="flex-1 py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 ${showBadRiderWarning ? "bg-red-600 hover:bg-red-500" : ""}`}
                  >
                    {showBadRiderWarning ? "Authorize Despite Warning" : "Confirm Dispatch"} <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------------------
            TAB 3: BAD RIDER REVIEWS
        -------------------------------------------------------------------------------- */}
        {activeTab === "reviews" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-red-500">
                <ThumbsDown /> Report Bad Rider
              </h2>
              <p className="text-zinc-400">Search for the past order using Customer Number/Phone to flag the rider.</p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search by Customer Phone or Name..."
                  className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-12"
                />
              </div>
            </div>

            {/* SEARCH RESULTS */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-white/5 text-zinc-400 uppercase text-xs">
                   <tr>
                     <th className="p-4">Date</th>
                     <th className="p-4">Customer</th>
                     <th className="p-4">Rider Info</th>
                     <th className="p-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {completedOrders
                     ?.filter(o => 
                        o.riderName && // Must have a rider
                        (o.customerName.toLowerCase().includes(reviewSearch.toLowerCase()) || 
                         (o.customerType === "DELIVERY" && o.riderPhone?.includes(reviewSearch))) // Loose search
                     )
                     .slice(0, 5) // Limit results
                     .map(order => (
                       <tr key={order._id} className="hover:bg-white/5">
                         <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                         <td className="p-4">
                           <div className="font-bold">{order.customerName}</div>
                           <div className="text-xs text-zinc-500">Order #{order._id.slice(-4)}</div>
                         </td>
                         <td className="p-4 text-zinc-300">
                           {order.riderName} <br/>
                           <span className="text-xs text-zinc-500">{order.riderPhone}</span>
                         </td>
                         <td className="p-4 text-right">
                           <button 
                             onClick={() => setSelectedOrderForReview(order)}
                             className="px-3 py-1.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-xs hover:bg-red-900/50"
                           >
                             Report Rider
                           </button>
                         </td>
                       </tr>
                   ))}
                 </tbody>
               </table>
               {!reviewSearch && <div className="p-8 text-center text-zinc-600 italic">Start typing to find past delivery orders...</div>}
            </div>

            {/* REVIEW MODAL (Inline) */}
            {selectedOrderForReview && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-zinc-900 border border-red-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" /> Flag Rider: {selectedOrderForReview.riderName}
                  </h3>
                  <textarea 
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="w-full h-32 bg-black border border-zinc-700 rounded-xl p-4 resize-none mb-4 focus:border-red-500 outline-none"
                    placeholder="Describe the issue (e.g., Rude behavior, Late arrival, Damaged goods)..."
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedOrderForReview(null)} className="flex-1 py-3 rounded-xl border border-white/10">Cancel</button>
                    <button onClick={handleSubmitReview} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500">Submit Report</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
