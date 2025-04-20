import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils, FaSpinner } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        console.log('Fetching orders');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders`);
        console.log('Orders response:', response.data);
        setOrders(response.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const markAsPrepared = async (orderId, tableId, sessionToken) => {
    try {
      console.log('Marking order as prepared:', orderId);
      await axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status: 'Prepared' });
      console.log('Resetting session for table:', tableId, 'session:', sessionToken);
      await axios.post(`${process.env.REACT_APP_API_URL}/api/orders/reset-session`, { tableId, sessionToken });
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: 'Prepared' } : order
        )
      );
    } catch (err) {
      console.error('Error marking order as prepared:', err);
      setError('Failed to update order status. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="container mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center flex items-center justify-center" style={{ color: '#92400e' }}>
          <FaUtensils className="mr-2" /> GSaheb Cafe - Operator Dashboard
        </h1>
        {isLoading ? (
          <div className="text-center text-gray-600">
            <FaSpinner className="animate-spin text-3xl mb-4" />
            <p>Loading orders...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-600">No orders available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg sm:text-xl font-semibold">Order #{order.orderNumber}</h2>
                <p className="text-gray-600">Table: {order.tableId}</p>
                <p className="text-gray-600">Status: {order.status}</p>
                <ul className="mt-2">
                  {order.items.map((item, index) => (
                    <li key={index} className="text-gray-600">
                      {item.quantity}x Item ID {item.itemId}
                    </li>
                  ))}
                </ul>
                {order.status === 'Pending' && (
                  <button
                    className="mt-4 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#b45309' }}
                    onClick={() => markAsPrepared(order._id, order.tableId, order.sessionToken)}
                  >
                    Mark as Prepared
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorDashboard;