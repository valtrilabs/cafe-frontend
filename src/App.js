import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import OperatorDashboard from './OperatorDashboard';
import PaymentDashboard from './PaymentDashboard';
import QRCodeGenerator from './QRCodeGenerator';
import ScanQR from './ScanQR';
import Menu from './Menu';
import WaiterOrder from './WaiterOrder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
        <Route path="/qr" element={<QRCodeGenerator />} />
        <Route path="/scanqr" element={<ScanQR />} />
        <Route path="/order" element={<Menu />} />
        <Route path="/waiter-order" element={<WaiterOrder />} />
        <Route path="/" element={<div>Welcome to GSaheb Cafe</div>} />
      </Routes>
    </Router>
  );
}

export default App;