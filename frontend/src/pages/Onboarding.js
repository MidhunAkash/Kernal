import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Onboarding() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({
    linkedin: '',
    x: '',
    github: '',
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserProfile(data);
        setFormData({
          linkedin: data.linkedin || '',
          x: data.x || '',
          github: data.github || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          linkedin: formData.linkedin || null,
          x: formData.x || null,
          github: formData.github || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Redirect to chat page after successful save
      navigate('/chat');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/chat');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-black">KERNAL.TECH.HELP</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.user_metadata?.name || user?.email}</span>
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-3">Complete Your Profile 🎉</h2>
            <p className="text-gray-600">
              Add your social links so others can connect with you. All fields are optional.
            </p>
          </div>

          {userProfile && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold mb-4">Your Account Details</h3>
              <div className="space-y-2 text-left">
                <p><span className="font-medium">Name:</span> {userProfile.name || 'Not provided'}</p>
                <p><span className="font-medium">Email:</span> {userProfile.email}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                data-testid="linkedin-input"
              />
            </div>

            {/* X (Twitter) */}
            <div>
              <label htmlFor="x" className="block text-sm font-medium text-gray-700 mb-2">
                X (Twitter) Profile URL
              </label>
              <input
                type="url"
                id="x"
                name="x"
                value={formData.x}
                onChange={handleChange}
                placeholder="https://x.com/yourhandle"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                data-testid="x-input"
              />
            </div>

            {/* GitHub */}
            <div>
              <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Profile URL
              </label>
              <input
                type="url"
                id="github"
                name="github"
                value={formData.github}
                onChange={handleChange}
                placeholder="https://github.com/yourusername"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                data-testid="github-input"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-black text-white px-6 py-3 rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="save-profile-btn"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded font-medium hover:bg-gray-50"
                data-testid="skip-btn"
              >
                Skip for Now
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            You can update these links anytime from your profile settings.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Onboarding;
