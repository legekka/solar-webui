import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { RoutingGraph } from './components/RoutingGraph';
import { Activity, Server } from 'lucide-react';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-nord-1 border-b border-nord-3 px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 mr-8">
          <Activity className="text-nord-8" size={24} />
          <span className="font-bold text-xl text-nord-6">Solar</span>
        </div>
        <Link
          to="/routing"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/routing'
              ? 'bg-nord-10 text-nord-6 font-medium'
              : 'text-nord-4 hover:bg-nord-2'
          }`}
        >
          <Activity size={18} />
          Routing
        </Link>
        <Link
          to="/hosts"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/hosts'
              ? 'bg-nord-10 text-nord-6 font-medium'
              : 'text-nord-4 hover:bg-nord-2'
          }`}
        >
          <Server size={18} />
          Hosts & Instances
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-nord-0">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/routing" replace />} />
          <Route path="/routing" element={<RoutingGraph />} />
          <Route path="/hosts" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

