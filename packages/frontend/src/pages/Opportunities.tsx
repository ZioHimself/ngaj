/**
 * Opportunities Page
 *
 * Main page showing discovered opportunities dashboard.
 * 
 * @see ADR-013: Opportunity Dashboard UI
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { OpportunitiesDashboard } from './OpportunitiesDashboard';
import logoHorizontal from '../assets/logo-horizontal.png';

export function Opportunities() {
  // TODO: Get accountId from auth context in production
  const accountId = 'default-account';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <img src={logoHorizontal} alt="ngaj" className="h-7" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <OpportunitiesDashboard accountId={accountId} />
      </main>
    </div>
  );
}
