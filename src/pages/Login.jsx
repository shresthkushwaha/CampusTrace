import { useAuth } from '../AuthContext';
import { LogIn } from 'lucide-react';

const Login = () => {
    const { signInWithGoogle, loading } = useAuth();

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-black mb-2">CampusTrace</h1>
                    <p className="text-gray-600">Report campus issues at VIT Vellore</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-8 shadow-lg">
                    <h2 className="text-2xl font-semibold text-black mb-6 text-center">
                        Sign In
                    </h2>

                    <p className="text-gray-600 text-sm mb-6 text-center">
                        Sign in with your Google account to submit and track campus issue reports
                    </p>

                    <button
                        onClick={signInWithGoogle}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {loading ? 'Loading...' : 'Continue with Google'}
                    </button>

                    <p className="text-xs text-gray-500 mt-6 text-center">
                        By signing in, you agree to use this platform responsibly for reporting genuine campus issues
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
