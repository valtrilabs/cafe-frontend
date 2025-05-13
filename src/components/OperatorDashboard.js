import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils, FaRupeeSign, FaClock, FaCheckCircle } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [soundPlayed, setSoundPlayed] = useState({});

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders`);
      const sortedOrders = response.data
        .filter(order => order.tableNumber != null)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sortedOrders);

      sortedOrders.forEach(order => {
        if (order.status === 'Pending' && !soundPlayed[order._id]) {
          const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/new-order.wav`);
          audio.play().catch(err => console.error('Audio playback error:', err));
          setSoundPlayed(prev => ({ ...prev, [order._id]: true }));
        }
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status.');
    }
  };

  const markAsPaid = async (orderId) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/paid`);
      fetchOrders();
    } catch (err) {
      console.error('Error marking order as paid:', err);
      setError('Failed to mark order as paid.');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 flex items-center justify-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Operator Dashboard - GSaheb Cafe
      </h1>
      {error && (
        <p className="text-center text-red-600 mb-4 bg-red-100 p-3 rounded-lg">{error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {orders.map(order => (
          <div
            key={order._id}
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 order-card"
            style={{
              border: order.status === 'Pending' ? '2px solid #f59e0b' : 'none'
            }}
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-2">
              Order #{order.orderNumber} - Table {order.tableNumber}
            </h2>
            <p className="text-gray-600 mb-2 flex items-center">
              <FaClock className="mr-2" /> {new Date(order.createdAt).toLocaleString()}
            </p>
            <p className="text-gray-600 mb-4">Status: {order.status}</p>
            <ul className="mb-4 space-y-2">
              {order.items.map(item => (
                <li key={item.itemId._id} className="flex justify-between">
                  <span>
                    {item.quantity} x {item.itemId.name}
                  </span>
                  <span className="flex items-center">
                    <FaRupeeSign className="mr-1" />
                    {(item.quantity * item.itemId.price).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-lg font-bold flex items-center mb-4">
              Total: <FaRupeeSign className="ml-1 mr-1" />
              {order.items.reduce((sum, item) => sum + item.quantity * item.itemId.price, 0).toFixed(2)}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {order.status !== 'Completed' && order.status !== 'Paid' && (
                <>
                  <button
                    className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => updateOrderStatus(order._id, order.status === 'Pending' ? 'Prepared' : 'Completed')}
                  >
                    <FaCheckCircle className="mr-2" />
                    {order.status === 'Pending' ? 'Mark as Prepared' : 'Mark as Completed'}
                  </button>
                </>
              )}
              {order.status !== 'Paid' && (
                <button
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                  style={{ backgroundColor: '#b45309' }}
                  onClick={() => markAsPaid(order._id)}
                >
                  <FaRupeeSign className="mr-2" /> Mark as Paid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OperatorDashboard;