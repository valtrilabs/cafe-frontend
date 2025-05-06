import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function ScanQR() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tableNumber = queryParams.get('table');
  const token = queryParams.get('token');

  // Log for debugging
  console.log('Current URL:', window.location.href);
  console.log('Query Parameters:', Object.fromEntries(queryParams));
  console.log('Extracted tableNumber:', tableNumber);
  console.log('Extracted token:', token);

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Processing QR code...');

  useEffect(() => {
    const validateAndCreateSession = async () => {
      // Validate tableNumber
      if (!tableNumber || isNaN(tableNumber) || Number(tableNumber) < 1) {
        setStatus('error');
        setMessage('Invalid table number. Please scan a valid QR code or contact the cafe staff.');
        return;
      }

      // Validate token
      if (!token) {
        setStatus('error');
        setMessage('Missing token. Please scan a valid QR code or contact the cafe staff.');
        return;
      }

      try {
        // Validate the token using the backend endpoint
        const validateResponse = await axios.get(
          `https://cafe-backend-ay2n.onrender.com/api/sessions/validate?token=${token}`
        );
        const { tableNumber: validatedTable } = validateResponse.data;

        if (Number(tableNumber) !== validatedTable) {
          setStatus('error');
          setMessage('Table number does not match the session. Please scan the correct QR code.');
          return;
        }

        // If token is valid, create a new session
        const response = await axios.post('https://cafe-backend-ay2n.onrender.com/api/sessions', {
          tableNumber: Number(tableNumber),
        });
        const sessionId = response.data.sessionId;
        setStatus('success');
        navigate(`/order?sessionId=${sessionId}&tableNumber=${tableNumber}`);
      } catch (err) {
        setStatus('error');
        const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
        setMessage(
          `Failed to validate or create session: ${errorMessage}. Please try again or contact the cafe staff.`
        );
      }
    };

    validateAndCreateSession();
  }, [tableNumber, token, navigate]);

  const displayMessage = location.state?.message || message;

  return (
    <div className="min-h-screen bg-orange-50 p-4 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Welcome to GSaheb Cafe</h1>
      {status === 'loading' ? (
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-5 w-5 text-amber-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-gray-600">{displayMessage}</p>
        </div>
      ) : (
        <p className={`text-center ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
          {displayMessage}
        </p>
      )}
    </div>
  );
}

export default ScanQR;