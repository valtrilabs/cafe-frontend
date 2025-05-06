import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Conditional imports to avoid build errors
let ScanQR, Menu, OperatorDashboard, PaymentDashboard, WaiterOrder, QRCodeGenerator;
try {
  ScanQR = require('./components/ScanQR').default;
} catch (e) {
  ScanQR = () => <div>Scan QR Not Available</div>;
  console.error("ScanQR module not found:", e.message);
}
try {
  Menu = require('./components/Menu').default;
} catch (e) {
  Menu = () => <div>Menu Not Available</div>;
  console.error("Menu module not found:", e.message);
}
try {
  OperatorDashboard = require('./components/OperatorDashboard').default;
} catch (e) {
  OperatorDashboard = () => <div>Operator Dashboard Not Available</div>;
  console.error("OperatorDashboard module not found:", e.message);
}
try {
  PaymentDashboard = require('./components/PaymentDashboard').default;
} catch (e) {
  PaymentDashboard = () => <div>Payment Dashboard Not Available</div>;
  console.error("PaymentDashboard module not found:", e.message);
}
try {
  WaiterOrder = require('./components/WaiterOrder').default;
} catch (e) {
  WaiterOrder = () => <div>Waiter Order Not Available</div>;
  console.error("WaiterOrder module not found:", e.message);
}
try {
  QRCodeGenerator = require('./components/QRCodeGenerator').default;
} catch (e) {
  QRCodeGenerator = () => <div>QR Code Generator Not Available</div>;
  console.error("QRCodeGenerator module not found:", e.message);
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/scan-qr" element={<ScanQR />} />
        <Route path="/order" element={<Menu />} />
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