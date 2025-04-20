import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaUtensils, FaSpinner } from 'react-icons/fa';

function OrderConfirmation() {
  const location = useLocation();
  const tableId = new URLSearchParams(location.search).get('table');
  const sessionToken = new URLSearchParams(location.search).get('session');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('OrderConfirmation loaded, table:', tableId, 'session:', sessionToken);
    // Simulate validation or fetching order details
    setTimeout(() => {
      if (!tableId || !sessionToken) {
        setError('Invalid order details.');
      }
      setIsLoading(false);
    }, 500);
  }, [tableId, sessionToken]);

  console.log('Rendering OrderConfirmation, state:', { isLoading, error });

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <FaUtensils className="text-4xl mb-4 mx-auto" style={{ color: '#b45309' }} />
        <h2 className="text-2xl font-bold mb-4">GSaheb Cafe - Table {tableId || 'Unknown'}</h2>
        {isLoading ? (
          <div className="text-gray-600">
            <FaSpinner className="animate-spin text-3xl mb-4" />
            <p>Loading order confirmation...</p>
          </div>
        ) : error ? (
          <div className="text-red-600">
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">Your order has been placed successfully!</p>
            <p className="text-gray-600">Thank you for ordering at GSaheb Cafe. Your order will be prepared soon.</p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.href = `/menu?table=${tableId}&session=${sessionToken}`}
            >
              Back to Menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default OrderConfirmation;