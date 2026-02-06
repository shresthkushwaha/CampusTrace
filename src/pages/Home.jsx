import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../config/admins';
import { Link } from 'react-router-dom';
import Map from '../components/Map';

const Home = () => {
    const { user, signOut } = useAuth();
    const userIsAdmin = isAdmin(user?.email);

    return (
        <div className="w-screen h-screen relative">
            <Map />

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
    );
};

export default Home;
