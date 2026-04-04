import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, MapPin } from 'lucide-react';
import { aiService } from '../services/aiService';

const TransportationSidebar = ({ user, isAdmin, onHotspotSelect }) => {
    const [hotspots, setHotspots] = useState([]);
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchHotspots();
    }, []);

    const fetchHotspots = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('transportation_hotspots')
            .select('*')
            .order('severity', { ascending: false });

        if (error) {
            console.error('Error fetching hotspots:', error);
        } else {
            setHotspots(data || []);
        }
        setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const result = await aiService.refreshHotspots();
        if (result.success) {
            fetchHotspots();
        } else {
            alert(`Refresh failed: ${result.error || result.message}`);
        }
        setIsRefreshing(false);
    };

    const handleSelect = (hotspot) => {
        setSelectedId(hotspot.id === selectedId ? null : hotspot.id);
        onHotspotSelect(hotspot.id === selectedId ? null : hotspot);
    };

    return (
        <div 
            className={`absolute top-0 right-0 h-full bg-white border-l-2 border-black z-20 transition-all duration-300 shadow-2xl flex flex-col ${
                isOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden'
            }`}
        >
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute top-1/2 -left-10 bg-white border-2 border-black p-2 rounded-l-md transform -translate-y-1/2 hover:bg-gray-100 transition-colors shadow-lg z-30`}
            >
                {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            {/* Sidebar Content */}
            <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-black border-b-2 border-purple-500 pb-1">
                        Transportation Problems
                    </h2>
                    {isAdmin && (
                        <button 
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-2 rounded-full hover:bg-gray-100 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh AI Insights"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-2 text-gray-500">
                            <RefreshCw size={24} className="animate-spin" />
                            <p className="text-sm">Loading hotspots...</p>
                        </div>
                    ) : hotspots.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <AlertCircle size={24} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500 italic">No consolidated hotspots found. Click refresh if you are an admin.</p>
                        </div>
                    ) : (
                        hotspots.map((hotspot) => (
                            <div 
                                key={hotspot.id}
                                onClick={() => handleSelect(hotspot)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedId === hotspot.id 
                                    ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-100' 
                                    : 'border-gray-100 hover:border-black hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-sm text-black leading-tight">
                                        {hotspot.theme_title}
                                    </h3>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                        hotspot.severity >= 4 ? 'bg-red-600 text-white' : 
                                        hotspot.severity >= 3 ? 'bg-orange-500 text-white' : 
                                        'bg-blue-600 text-white'
                                    }`}>
                                        S{hotspot.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-3 mb-3 leading-relaxed">
                                    {hotspot.summary}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-600">
                                    <MapPin size={10} />
                                    <span>VIEW ON MAP</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 italic text-[10px] text-gray-400 text-center">
                    Powered by AI Analysis (Gemma)
                </div>
            </div>
        </div>
    );
};

export default TransportationSidebar;
