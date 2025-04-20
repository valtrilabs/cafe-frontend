import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Menu from './components/Menu';
import Operator from './components/Operator';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/order" element={<Menu />} />
        <Route path="/operator" element={<Operator />} />
        <Route path="/" element={<Navigate to="/order" replace />} />
        <Route path="*" element={<div className="min-h-screen bg-orange-50 flex items-center justify-center">
          <p className="text-gray-600">Please scan a valid QR code to access the menu.</p>
        </div>} />
      </Routes>
    </Router>
  );
}

export default App;