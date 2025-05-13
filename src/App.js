import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScanQR from './components/ScanQR';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import WaiterOrder from './components/WaiterOrder';
import QRCodeGenerator from './components/QRCodeGenerator';
import OrderSummary from './components/OrderSummary';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/scan-qr" element={<ScanQR />} />
        <Route path="/order" element={<Menu />} />
        <Route path="/summary" element={<OrderSummary />} />
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