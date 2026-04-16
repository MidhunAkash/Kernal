import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Onboarding() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-black">KERNAL.TECH.HELP</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-black"
                data-testid="logout-btn"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-black mb-6">Welcome to Kernal! 🎉</h2>
            <p className="text-xl text-gray-600 mb-8">
              You've successfully created your account. This is your onboarding page.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-8 mb-8">
              <h3 className="text-lg font-bold mb-4">Your Account Details</h3>
              <div className="space-y-2 text-left">
                <p><span className="font-medium">Name:</span> {user?.name}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <p><span className="font-medium">Role:</span> {user?.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                This is a placeholder onboarding page. You can customize this with your own content,
                tutorials, or setup steps for new users.
              </p>
              <button
                onClick={() => navigate('/')}
                className="bg-black text-white px-8 py-3 rounded font-medium hover:bg-gray-800"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Onboarding;