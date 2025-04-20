import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaQrcode } from 'react-icons/fa';

function QRPrompt() {
  const location = useLocation();
  const tableId = new URLSearchParams(location.search).get('table') || 'Unknown';
  const sessionToken = new URLSearchParams(location.search).get('session');
  const [sessionStatus, setSessionStatus] = useState(null);

  useEffect(() => {
    const checkSessionStatus = async () => {
      if (sessionToken) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/session/status`, {
            params: { table: tableId, session: sessionToken }
          });
          setSessionStatus(response.data.status);
        } catch (err) {
          console.error('Error checking session status:', err);
          setSessionStatus('invalid');
        }
      } else {
        setSessionStatus('invalid');
      }
    };
    checkSessionStatus();
  }, [tableId, sessionToken]);

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <FaQrcode className="text-4xl mb-4 mx-auto" style={{ color: '#b45309' }} />
        <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>
        <p className="text-gray-600 mb-4">
          Please scan the QR code for Table {tableId} to access the menu and place an order.
        </p>
        {sessionStatus && sessionStatus !== 'active' && (
          <p className="text-gray-500 text-sm">
            {sessionStatus === 'pending' && 'Your order is being prepared. Scan a new QR code to place another order.'}
            {sessionStatus === 'prepared' && 'Your order has been prepared. Scan a new QR code to place another order.'}
            {sessionStatus === 'expired' && 'Your session has expired. Please scan a new QR code.'}
            {sessionStatus === 'invalid' && 'Invalid session. Please scan the QR code again.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default QRPrompt;