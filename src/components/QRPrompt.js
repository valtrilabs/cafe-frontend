import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUtensils, FaRedo } from 'react-icons/fa';

function QRPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const tableId = new URLSearchParams(location.search).get('table');
  const sessionToken = new URLSearchParams(location.search).get('session');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      console.log('QR Prompt URL:', window.location.href); // Debug URL
      console.log('Table ID:', tableId, 'Session Token:', sessionToken); // Debug params

      if (!tableId || isNaN(parseInt(tableId))) {
        setError('Invalid table number. Please scan a valid QR code.');
        setIsLoading(false);
        return;
      }
      if (!sessionToken) {
        setError('Missing session token. Please scan a valid QR code.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/session/status`, {
          params: { table: tableId, session: sessionToken }
        });
        console.log('Session status response:', response.data); // Debug response
        setStatus(response.data.status);
        if (response.data.status === 'active') {
          localStorage.setItem(`sessionToken_${tableId}`, sessionToken);
          navigate(`/menu?table=${tableId}&session=${sessionToken}`);
        } else {
          setError(`Session is ${response.data.status}. Please scan a new QR code.`);
        }
      } catch (err) {
        console.error('Error checking session:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(
          err.response?.data?.error ||
          'Failed to validate QR code. Please check your connection and try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [tableId, sessionToken, navigate]);

  const getMessage = () => {
    switch (status) {
      case 'pending':
        return 'Your order is being prepared. Please wait.';
      case 'prepared':
        return 'Your order is ready. Please scan a new QR code to place another order.';
      case 'expired':
        return 'This session has expired. Please scan a new QR code.';
      default:
        return 'Invalid or inactive session. Please scan the QR code again.';
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <FaUtensils className="text-4xl mb-4 mx-auto" style={{ color: '#b45309' }} />
        <h2 className="text-2xl font-bold mb-4">GSaheb Cafe - Table {tableId || 'Unknown'}</h2>
        {isLoading ? (
          <p className="text-gray-600">Validating QR code...</p>
        ) : error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              className="px-4 py-2 rounded-lg text-white flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              <FaRedo className="mr-2" /> Try Again
            </button>
          </>
        ) : (
          <p className="text-gray-600">{getMessage()}</p>
        )}
      </div>
    </div>
  );
}

export default QRPrompt;