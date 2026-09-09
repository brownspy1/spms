import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PosTerminal from './pages/PosTerminal';
import Inventory from './pages/Inventory';
import Prescriptions from './pages/Prescriptions';
import InteractionsChecker from './pages/InteractionsChecker';
import PurchaseOrders from './pages/PurchaseOrders';
import Customers from './pages/Customers';
import AuditLogs from './pages/AuditLogs';
import SecuritySettings from './pages/SecuritySettings';
import Login from './pages/Login';
import { getStoredUser, authApi, medicinesApi } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('spms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('spms:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSystemAlerts();
    }
  }, [currentUser]);

  const loadSystemAlerts = async () => {
    try {
      const [lowStock, expiring] = await Promise.all([
        medicinesApi.getLowStockAlerts(),
        medicinesApi.getExpiringAlerts(90),
      ]);
      setLowStockCount(lowStock.length);
      setExpiringCount(expiring.length);
    } catch (e) {
      console.error('Failed to load alert badges:', e);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-['Inter',sans-serif]">
      <Navbar
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        lowStockCount={lowStockCount}
        expiringCount={expiringCount}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={currentUser.role} />

        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard setActiveTab={setActiveTab} userRole={currentUser.role} />
          )}
          {activeTab === 'pos' && <PosTerminal currentUser={currentUser} />}
          {activeTab === 'inventory' && <Inventory userRole={currentUser.role} />}
          {activeTab === 'prescriptions' && <Prescriptions userRole={currentUser.role} />}
          {activeTab === 'interactions' && <InteractionsChecker />}
          {activeTab === 'procurement' && <PurchaseOrders userRole={currentUser.role} />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'security' && (
            <SecuritySettings currentUser={currentUser} onUserUpdate={setCurrentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
