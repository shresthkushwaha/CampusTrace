import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../config/admins';
import { Link } from 'react-router-dom';
import Map from '../components/Map';
import TransportationSidebar from '../components/TransportationSidebar';
import { useState } from 'react';

const Home = () => {
    const { user, signOut } = useAuth();
    const userIsAdmin = isAdmin(user?.email);
    const [selectedHotspot, setSelectedHotspot] = useState(null);

    return (
        <div className="w-screen h-screen relative flex overflow-hidden">
            <div className="flex-1 relative h-full">
                <Map user={user} selectedHotspot={selectedHotspot} />

                {/* User info and sign out button */}
                <div className="absolute top-4 left-4 bg-white border-2 border-black rounded-lg px-4 py-2 shadow-lg z-10 flex items-center gap-3">
                <div className="text-sm">
                    <p className="font-semibold text-black">{user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
                </div>

                {userIsAdmin && (
                    <Link
                        to="/admin"
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Admin Dashboard"
                    >
                        <Shield size={18} className="text-blue-600" />
                    </Link>
                )}

                <button
                    onClick={signOut}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Sign out"
                >
                    <LogOut size={18} />
                </button>
            </div>
            </div>
            
            <TransportationSidebar 
                user={user} 
                isAdmin={userIsAdmin} 
                onHotspotSelect={setSelectedHotspot} 
            />
        </div>
    );
};

export default Home;
