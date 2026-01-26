import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SetupWizard, Opportunities, LoginPage } from './pages';

/**
 * App Root Component
 *
 * Handles routing with authentication and wizard activation:
 * - If not authenticated → show login page
 * - If authenticated but no profile → redirect to /setup
 * - If authenticated and profile exists → show opportunities
 *
 * @see ADR-014: Simple Token Authentication
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if profile exists (called after auth and on login success)
  const checkProfile = useCallback(async () => {
    try {
      const profileResponse = await fetch('/api/wizard/check');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setHasProfile(profileData.hasProfile);
      } else {
        setHasProfile(false);
      }
    } catch {
      setHasProfile(false);
    }
  }, []);

  // Handle login success: set authenticated and check profile
  const handleLoginSuccess = useCallback(async () => {
    setIsAuthenticated(true);
    await checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    // Check authentication status and profile
    const checkAuthAndProfile = async () => {
      try {
        // First check auth status
        const authResponse = await fetch('/api/auth/status');

        if (authResponse.status === 401) {
          // Not authenticated
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (authResponse.ok) {
          const authData = await authResponse.json();
          setIsAuthenticated(authData.authenticated);

          if (!authData.authenticated) {
            setIsLoading(false);
            return;
          }

          // If authenticated, check if setup is needed
          await checkProfile();
        } else {
          // Auth check failed, assume not authenticated
          setIsAuthenticated(false);
        }
      } catch {
        // Network error, assume not authenticated
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndProfile();
  }, [checkProfile]);

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
        {/* Login page (public) */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={hasProfile ? '/opportunities' : '/setup'} replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Setup wizard route (requires auth) */}
        <Route
          path="/setup"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : hasProfile ? (
              <Navigate to="/opportunities" replace />
            ) : (
              <SetupWizard onSetupComplete={() => setHasProfile(true)} />
            )
          }
        />

        {/* Main opportunities page (requires auth + profile) */}
        <Route
          path="/opportunities"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !hasProfile ? (
              <Navigate to="/setup" replace />
            ) : (
              <Opportunities />
            )
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to={hasProfile ? '/opportunities' : '/setup'} replace />
            )
          }
        />

        {/* Catch-all redirect */}
        <Route
          path="*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to={hasProfile ? '/opportunities' : '/setup'} replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

