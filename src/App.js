import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import QRCodeGenerator from './components/QRCodeGenerator';
import ScanQR from './components/ScanQR';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/order" element={<Menu />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
        <Route path="/qr" element={<QRCodeGenerator />} />
        <Route path="/scan-qr" element={<ScanQR />} />
      </Routes>
    </Router>
  );
}

export default App;