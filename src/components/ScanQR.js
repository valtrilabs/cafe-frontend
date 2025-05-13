import React from 'react';
import { FaQrcode } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

function ScanQR() {
  const location = useLocation();
  const message = location.state?.message || 'Please scan the QR code for your table to access the menu.';

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 flex items-center justify-center">
          <FaQrcode className="mr-2" style={{ color: '#b45309' }} /> Scan QR Code
        </h1>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-gray-600">If you believe this is an error, contact the cafe staff.</p>
      </div>
    </div>
  );
}

export default ScanQR;