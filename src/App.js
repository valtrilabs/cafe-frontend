import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScanQR from './components/ScanQR';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import WaiterOrder from './components/WaiterOrder';
import QRCodeGenerator from './components/QRCodeGenerator';
import OrderSummary from './components/OrderSummary';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('sessionToken');
  return token ? children : <Navigate to="/scan-qr" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/scan-qr" element={<ScanQR />} />
        <Route
          path="/order"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <OrderSummary />
            </ProtectedRoute>
          }
        />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
        <Route path="/waiter" element={<WaiterOrder />} />
        <Route path="/qr" element={<QRCodeGenerator />} />
        <Route path="/" element={<ScanQR />} />
      </Routes>
    </Router>
  );
}

export default App;