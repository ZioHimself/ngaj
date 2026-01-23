import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SetupWizard, Opportunities } from './pages';

/**
 * App Root Component
 *
 * Handles routing and wizard activation:
 * - If no profile exists → redirect to /setup
 * - If profile exists → show opportunities
 */
function App() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if setup is needed
    const checkProfile = async () => {
      try {
        const response = await fetch('/api/wizard/check');
        if (response.ok) {
          const data = await response.json();
          setHasProfile(data.hasProfile);
        } else {
          // API not available, assume no profile
          setHasProfile(false);
        }
      } catch {
        // Error checking, assume no profile
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading ngaj...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Setup wizard route */}
        <Route
          path="/setup"
          element={
            hasProfile ? <Navigate to="/opportunities" replace /> : <SetupWizard />
          }
        />

        {/* Main opportunities page */}
        <Route
          path="/opportunities"
          element={
            hasProfile ? <Opportunities /> : <Navigate to="/setup" replace />
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            <Navigate to={hasProfile ? '/opportunities' : '/setup'} replace />
          }
        />

        {/* Catch-all redirect */}
        <Route
          path="*"
          element={
            <Navigate to={hasProfile ? '/opportunities' : '/setup'} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

