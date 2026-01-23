/**
 * Opportunities Page
 *
 * Main page showing discovered opportunities queue.
 * This is a placeholder - full implementation per ADR-013.
 */

export function Opportunities() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-slate-800">ngaj</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Setup Complete!
          </h2>
          <p className="text-slate-500 mb-6">
            ngaj is now configured and ready to discover opportunities.
          </p>
          <div className="bg-slate-50 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-medium text-slate-700 mb-2">What's Next?</h3>
            <ul className="text-sm text-slate-600 text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  Discovery will run automatically based on your schedule
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Opportunities will appear here when found</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Review and approve responses before posting</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
