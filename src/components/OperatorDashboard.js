import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils, FaCheck, FaTimes, FaClock, FaTable, FaRupeeSign} from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Pending');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const STATIC_PASSWORD = 'Operator2025';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === STATIC_PASSWORD) {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Incorrect password.');
    }
  };

  const fetchOrders = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders?date=today`)
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
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => {
        clearInterval(interval);
        clearInterval(timeInterval);
      };
    }
  }, [isAuthenticated]);

  const handleMarkPrepared = (orderId) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status: 'Prepared' })
      .then(() => {
        fetchOrders();
      })
      .catch(err => {
        console.error('Error marking prepared:', err);
        setError('Failed to mark as prepared.');
      });
  };

  const handleCancelOrder = (orderId) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`)
      .then(() => {
        fetchOrders();
      })
      .catch(err => {
        console.error('Error canceling order:', err);
        setError('Failed to cancel order.');
      });
  };

  const filteredOrders = orders.filter(order => order.status === activeTab);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Operator Dashboard Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Operator Dashboard - GSaheb Cafe
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2 sm:mt-0">
          <FaClock className="inline mr-2" /> {currentTime.toLocaleString()}
        </p>
      </div>

      {error && (
        <p className="text-center text-red-600 mb-4">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['Pending', 'Prepared', 'Completed'].map(status => (
          <button
            key={status}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: activeTab === status ? '#b45309' : '#fed7aa',
              color: activeTab === status ? '#ffffff' : '#1f2937'
            }}
            onClick={() => setActiveTab(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredOrders.length === 0 ? (
          <p className="text-center col-span-full text-gray-600">No {activeTab.toLowerCase()} orders found.</p>
        ) : (
          filteredOrders.map(order => (
            <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                <FaTable className="mr-2" style={{ color: '#b45309' }} /> Table {order.tableNumber} (Order #{order.orderNumber})
              </h2>
              <p className="text-gray-600 text-sm flex items-center">
                <FaClock className="mr-2" /> Placed: {new Date(order.createdAt).toLocaleString()}
              </p>
              <ul className="mt-2 space-y-1">
                {order.items.map((item, index) => (
                  <li key={index} className="text-gray-600 text-sm">
                    {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (
                    <FaRupeeSign className="inline mr-1" />
                    {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-bold text-gray-800 flex items-center">
                Total: <FaRupeeSign className="ml-1 mr-1" />
                {order.items.reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0).toFixed(2)}
              </p>
              <p className={`mt-2 text-sm font-medium ${order.status === 'Pending' ? 'text-red-600' : order.status === 'Prepared' ? 'text-green-600' : 'text-blue-600'}`}>
                Status: {order.status}
              </p>
              {order.status === 'Pending' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => handleMarkPrepared(order._id)}
                  >
                    <FaCheck className="mr-2" /> Mark Prepared
                  </button>
                  <button
                    className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#dc2626' }}
                    onClick={() => handleCancelOrder(order._id)}
                  >
                    <FaTimes className="mr-2" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OperatorDashboard;