import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils, FaClock, FaCheckCircle, FaTrash } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState('Pending');
  const [error, setError] = useState(null);

  const fetchOrders = (date = 'today') => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders`, { params: { date } })
      .then(res => {
        console.log('Orders fetched:', res.data);
        setOrders(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStatus = (orderId, status) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status })
      .then(res => {
        console.log('Order updated:', res.data);
        setOrders(orders.map(order => order._id === orderId ? res.data : order));
      })
      .catch(err => {
        console.error('Error updating order:', err);
        setError('Failed to update order. Please try again.');
      });
  };

  const cancelOrder = (orderId) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`)
      .then(() => {
        console.log('Order canceled:', orderId);
        setOrders(orders.filter(order => order._id !== orderId));
      })
      .catch(err => {
        console.error('Error canceling order:', err);
        setError('Failed to cancel order. Please try again.');
      });
  };

  const filteredOrders = orders.filter(order => order.status === selectedTab);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <header className="bg-amber-800 text-white p-4 rounded-lg shadow-lg mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaUtensils className="mr-2" /> Operator Dashboard
        </h1>
      </header>

      {error && (
        <div className="text-center text-red-600 mb-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg"
            onClick={() => fetchOrders()}
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex space-x-2 mb-6">
        {['Pending', 'Prepared', 'Completed'].map(tab => (
          <button
            key={tab}
            className={`flex-1 py-2 rounded-lg text-center font-medium ${
              selectedTab === tab ? 'bg-amber-600 text-white' : 'bg-amber-200 text-gray-800'
            }`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <p className="text-center text-gray-600">No {selectedTab.toLowerCase()} orders.</p>
        ) : (
          filteredOrders.map(order => (
            <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">
                  Order #{order.orderNumber} - Table {order.tableNumber}
                </h2>
                <span className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
              <ul className="mb-4">
                {order.items.map((item, index) => (
                  <li key={index} className="text-gray-700">
                    {item.quantity} x {item.itemId?.name || 'Unknown Item'} (₹{(item.quantity * (item.itemId?.price || 0)).toFixed(2)})
                  </li>
                ))}
              </ul>
              <div className="flex space-x-2">
                {selectedTab === 'Pending' && (
                  <>
                    <button
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center"
                      onClick={() => updateOrderStatus(order._id, 'Prepared')}
                    >
                      <FaCheckCircle className="mr-2" /> Mark Prepared
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg"
                      onClick={() => cancelOrder(order._id)}
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
                {selectedTab === 'Prepared' && (
                  <button
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center"
                    onClick={() => updateOrderStatus(order._id, 'Completed')}
                  >
                    <FaCheckCircle className="mr-2" /> Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OperatorDashboard;