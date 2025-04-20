import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import OperatorDashboard from './components/OperatorDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import QRCodeGenerator from './components/QRCodeGenerator';
import QRPrompt from './components/QRPrompt';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/order" element={<Menu />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/payment" element={<PaymentDashboard />} />
        <Route path="/qr" element={<QRCodeGenerator />} />
        <Route path="/qr-prompt" element={<QRPrompt />} />
      </Routes>
    </Router>
  );
}

export default App;