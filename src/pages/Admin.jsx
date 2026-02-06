import { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Map from '../components/Map';

const Admin = () => {
    const { user, signOut } = useAuth();
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchReports();
    }, [refreshTrigger]);

    const fetchReports = async () => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            setReports(data || []);
        }
    };

    const handleResolve = async (reportId) => {
        const { error } = await supabase
            .from('reports')
            .update({ status: 'resolved' })
            .eq('id', reportId);

        if (error) {
            console.error('Error resolving report:', error);
            alert('Failed to resolve report');
        } else {
            fetchReports();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const downloadCSV = () => {
        // Create CSV header
        const headers = ['Category', 'Description', 'Status', 'Latitude', 'Longitude', 'Date', 'User Email', 'IP Address'];

        // Create CSV rows
        const rows = reports.map(report => [
            report.category,
            report.description || 'No description',
            report.status,
            report.lat,
            report.lng,
            new Date(report.created_at).toLocaleString(),
            report.user_id || 'N/A',
            report.user_ip || 'N/A'
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `campus-reports-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Left Panel - Reports List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <Link
                            to="/"
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Back to Home"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="text-right text-xs">
                                <p className="font-semibold text-black">{user?.user_metadata?.full_name || 'Admin'}</p>
                                <p className="text-gray-600">{user?.email}</p>
                            </div>
                            <button
                                onClick={signOut}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Sign out"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-black">Admin Dashboard</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {reports.length} total reports
                            </p>
                        </div>
                        <button
                            onClick={downloadCSV}
                            className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
                            title="Download all reports as CSV"
                        >
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => setSelectedReport(report)}
                            className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedReport?.id === report.id ? 'bg-gray-100' : ''
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {report.status === 'resolved' ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <Clock size={18} className="text-red-600" />
                                    )}
                                    <span className="font-semibold text-black">
                                        {report.category}
                                    </span>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded ${report.status === 'resolved'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}
                                >
                                    {report.status}
                                </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                {report.description || 'No description provided'}
                            </p>

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span>
                                        {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                                    </span>
                                </div>
                                <span>{formatDate(report.created_at)}</span>
                            </div>

                            {report.user_ip && (
                                <div className="text-xs text-gray-500">
                                    IP: {report.user_ip}
                                </div>
                            )}
                            {report.status === 'open' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolve(report.id);
                                    }}
                                    className="mt-3 w-full px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
                                >
                                    Mark as Resolved
                                </button>
                            )}
                        </div>
                    ))}

                    {reports.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p>No reports yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Map */}
            <div className="flex-1">
                <Map
                    selectedReport={selectedReport}
                    onReportAdded={() => setRefreshTrigger((prev) => prev + 1)}
                />
            </div>
        </div>
    );
};

export default Admin;
