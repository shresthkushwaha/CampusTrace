import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../config/admins';

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin(user.email)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <h1 className="text-4xl font-bold text-black mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to access the admin dashboard.
                    </p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Back to Home
                    </a>
                </div>
            </div>
        );
    }

    return children;
};

export default AdminRoute;
