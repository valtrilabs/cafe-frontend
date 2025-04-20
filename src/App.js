import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRCodeGenerator from './QRCodeGenerator';
import QRPrompt from './QRPrompt';
import Menu from './Menu';
import OperatorDashboard from './OperatorDashboard';
import OrderConfirmation from './OrderConfirmation';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/qrcodes" element={<QRCodeGenerator />} />
        <Route path="/qr-prompt" element={<QRPrompt />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/" element={<QRCodeGenerator />} />
        <Route path="payment" element={<PaymentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;