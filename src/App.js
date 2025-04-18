import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;