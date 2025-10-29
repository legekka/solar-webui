import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { RoutingGraph } from './components/RoutingGraph';
import { Activity, Server } from 'lucide-react';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 mr-8">
          <Activity className="text-blue-600" size={24} />
          <span className="font-bold text-xl text-gray-900">Solar</span>
        </div>
        <Link
          to="/routing"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/routing'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Activity size={18} />
          Routing
        </Link>
        <Link
          to="/hosts"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            location.pathname === '/hosts'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
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
      <div className="min-h-screen bg-gray-50">
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

