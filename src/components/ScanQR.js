import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUtensils } from 'react-icons/fa';
import axios from 'axios';

function ScanQR() {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message;

  useEffect(() => {
    const createSession = async (tableNumber) => {
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions/create`, { tableNumber });
        localStorage.setItem('sessionToken', response.data.token);
        navigate(`/order?table=${tableNumber}`);
      } catch (err) {
        console.error('Error creating session:', err.response?.data || err.message);
        navigate('/scan-qr', { state: { message: 'Failed to create session. Please try again.' } });
      }
    };

    const urlParams = new URLSearchParams(location.search);
    const table = urlParams.get('table');
    if (table && !isNaN(table) && table >= 1 && table <= 6) {
      createSession(parseInt(table));
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 flex items-center justify-center">
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> GSaheb Cafe
        </h1>
        <p className="text-gray-600 mb-4">Please scan the QR code on your table to view the menu and place an order.</p>
        {message && (
          <p className="text-red-600 mb-4">{message}</p>
        )}
      </div>
    </div>
  );
}

export default ScanQR;