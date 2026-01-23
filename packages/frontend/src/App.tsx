import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-16">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              ngaj
            </h1>
            <p className="text-xl text-gray-600">
              Proactive Engagement Companion for Social Media
            </p>
          </header>

          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              System Status
            </h2>
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  ❌ Error connecting to backend: {error}
                </p>
              </div>
            ) : health ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">
                  ✅ Backend is {health.status}
                </p>
                <p className="text-green-700 text-sm">
                  Environment: {health.environment}
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Last check: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">🔄 Checking backend status...</p>
              </div>
            )}
          </div>

          {/* API Info */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Available Endpoints
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-green-600 font-mono text-sm mr-3">GET</span>
                <code className="text-gray-700 bg-gray-100 px-3 py-1 rounded">
                  /api/health
                </code>
                <span className="text-gray-500 text-sm ml-3">Health check</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 font-mono text-sm mr-3">GET</span>
                <code className="text-gray-700 bg-gray-100 px-3 py-1 rounded">
                  /api
                </code>
                <span className="text-gray-500 text-sm ml-3">API information</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 font-mono text-sm mr-3">GET</span>
                <code className="text-gray-400 bg-gray-50 px-3 py-1 rounded">
                  /api/profiles
                </code>
                <span className="text-gray-400 text-sm ml-3">Coming in Phase 2</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 font-mono text-sm mr-3">GET</span>
                <code className="text-gray-400 bg-gray-50 px-3 py-1 rounded">
                  /api/accounts
                </code>
                <span className="text-gray-400 text-sm ml-3">Coming in Phase 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

