import { useState } from 'react';
import { Layers } from 'lucide-react';
import CreatorDashboard from './components/CreatorDashboard';
import UserViewer from './components/UserViewer';

function App() {
  const [mode, setMode] = useState('creator');

  // Check if we're in "viewer only" mode via URL param
  const isViewerOnly = new URLSearchParams(window.location.search).get('mode') === 'viewer';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Cross Stitch App
          </h1>
          {!isViewerOnly && (
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('creator')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'creator'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Creator Tool
              </button>
              <button
                onClick={() => setMode('user')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'user'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                User Viewer
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {mode === 'creator' ? (
          <CreatorDashboard />
        ) : (
          <UserViewer />
        )}
      </main>
    </div>
  );
}

export default App;
