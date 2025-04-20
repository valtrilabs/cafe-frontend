import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaQrcode } from 'react-icons/fa';

function QRPrompt() {
  const location = useLocation();
  const tableNumber = new URLSearchParams(location.search).get('table') || 'Unknown';

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <FaQrcode className="text-4xl mb-4 mx-auto" style={{ color: '#b45309' }} />
        <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>
        <p className="text-gray-600 mb-4">
          Please scan the QR code for Table {tableNumber} to access the menu and place an order.
        </p>
        <p className="text-gray-500 text-sm">
          If you have already placed an order, it may be in preparation or completed. Scan the QR code again to place a new order.
        </p>
      </div>
    </div>
  );
}

export default QRPrompt;