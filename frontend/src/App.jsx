import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PosTerminal from './pages/PosTerminal';
import OrdersHistory from './pages/OrdersHistory';
import Inventory from './pages/Inventory';
import Prescriptions from './pages/Prescriptions';
import InteractionsChecker from './pages/InteractionsChecker';
import PurchaseOrders from './pages/PurchaseOrders';
import Customers from './pages/Customers';
import AuditLogs from './pages/AuditLogs';
import SecuritySettings from './pages/SecuritySettings';
import StaffManagement from './pages/StaffManagement';
import Login from './pages/Login';
import GlobalAIChatbot from './components/GlobalAIChatbot';
import { getStoredUser, authApi, medicinesApi } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [alertsData, setAlertsData] = useState({ lowStock: [], expiring: [] });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setAlertsData({ lowStock: lowStock || [], expiring: expiring || [] });
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
        alertsData={alertsData}
        onNavigateTab={setActiveTab}
        onRefreshAlerts={loadSystemAlerts}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={currentUser.role}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard setActiveTab={setActiveTab} userRole={currentUser.role} />
          )}
          {activeTab === 'pos' && <PosTerminal currentUser={currentUser} />}
          {activeTab === 'orders' && <OrdersHistory />}
          {activeTab === 'inventory' && <Inventory userRole={currentUser.role} />}
          {activeTab === 'prescriptions' && <Prescriptions userRole={currentUser.role} onNavigateTab={setActiveTab} />}
          {activeTab === 'interactions' && <InteractionsChecker />}
          {activeTab === 'procurement' && <PurchaseOrders userRole={currentUser.role} />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'staff' && <StaffManagement currentUser={currentUser} />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'security' && (
            <SecuritySettings currentUser={currentUser} onUserUpdate={setCurrentUser} />
          )}
        </main>
      </div>

      {/* Global Floating AI Clinical Assistant */}
      <GlobalAIChatbot />
    </div>
  );
}
