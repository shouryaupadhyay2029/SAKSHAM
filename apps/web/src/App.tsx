import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import OperationsLayout from './layouts/OperationsLayout';

// Pages
import Landing from './pages/Landing/Landing';
import CommandCenter from './pages/CommandCenter/CommandCenter';
import Incidents from './pages/Incidents/Incidents';
import Resources from './pages/Resources/Resources';
import Requests from './pages/Requests/Requests';
import Vehicles from './pages/Vehicles/Vehicles';
import Shelters from './pages/Shelters/Shelters';
import Analytics from './pages/Analytics/Analytics';
import NotFound from './pages/NotFound/NotFound';

import Report from './pages/Report/Report';
import Help from './pages/Help/Help';
import { OperationalStateProvider } from './context/OperationalStateContext';
import { SmoothScrollProvider } from './motion/scroll/LenisProvider';
import BootScreen from './components/BootScreen/BootScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const App: React.FC = () => {
  const [showBoot, setShowBoot] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('saksham_boot_seen');
    }
    return true;
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('saksham_boot_seen', 'true');
    setShowBoot(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <OperationalStateProvider>
        <SmoothScrollProvider>
          {showBoot && <BootScreen onComplete={handleBootComplete} />}
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<Landing />} />
                <Route path="report" element={<Report />} />
                <Route path="help" element={<Help />} />
              </Route>

              {/* Operations / Command Board Routes */}
              <Route path="/operations" element={<OperationsLayout />}>
                <Route index element={<Navigate to="/operations/command-center" replace />} />
                <Route path="command-center" element={<CommandCenter />} />
                <Route path="incidents" element={<Incidents />} />
                <Route path="resources" element={<Resources />} />
                <Route path="requests" element={<Requests />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="shelters" element={<Shelters />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>

              {/* Fallback Area */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SmoothScrollProvider>
      </OperationalStateProvider>
    </QueryClientProvider>
  );
};

export default App;
