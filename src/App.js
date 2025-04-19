import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import QRCodeGenerator from './components/QRCodeGenerator';

function ProtectedMenu() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const tableNumber = query.get('table');
  const qrScanValid = sessionStorage.getItem('qrScanValid');

  // Allow access if tableNumber is valid and qrScanValid is set
  if (tableNumber && !isNaN(tableNumber) && qrScanValid) {
    return <Menu />;
  }

  // Redirect to /qr, preserving the current path as a return URL (optional)
  return <Navigate to="/qr" replace state={{ from: location }} />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProtectedMenu />} />
        <Route path="/order" element={<ProtectedMenu />} />
        <Route path="/menu" element={<ProtectedMenu />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
        <Route path="/qr" element={<QRCodeGenerator />} />
        <Route path="*" element={<Navigate to="/qr" replace />} />
      </Routes>
    </Router>
  );
}

export default App;