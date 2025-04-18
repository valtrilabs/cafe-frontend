import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaPrint, FaCheck, FaUtensils, FaClock, FaChartLine, FaFileExport, FaTable, FaRupeeSign } from 'react-icons/fa';

function PaymentDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [revenueData, setRevenueData] = useState({
    today: 0,
    week: 0,
    month: 0,
    year: 0
  });
  const [activeTable, setActiveTable] = useState('All');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // For Feature 6
  const [password, setPassword] = useState(''); // For Feature 6
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });

  // Feature 6: Password Protection
  useEffect(() => {
    const storedAuth = localStorage.getItem('paymentAuth');
    if (storedAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Replace with a secure password in production
      setIsAuthenticated(true);
      localStorage.setItem('paymentAuth', 'true');
      setError(null);
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('paymentAuth');
    setPassword('');
  };

  const fetchOrders = (startDate = null, endDate = null) => {
    let url = `${process.env.REACT_APP_API_URL}/api/orders`;
    if (startDate && endDate) {
      url += `?dateFrom=${startDate.toISOString()}&dateTo=${endDate.toISOString()}`;
    }
    axios.get(url)
      .then(res => {
        console.log('Orders fetched:', res.data);
        const sortedOrders = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sortedOrders);
        calculateRevenue(sortedOrders);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  const calculateRevenue = (orders) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

    const revenue = {
      today: 0,
      week: 0,
      month: 0,
      year: 0
    };

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      let total = 0;
      order.items.forEach(item => {
        if (item.itemId) {
          total += item.quantity * item.itemId.price;
        }
      });

      if (orderDate >= todayStart) revenue.today += total;
      if (orderDate >= weekStart) revenue.week += total;
      if (orderDate >= monthStart) revenue.month += total;
      if (orderDate >= yearStart) revenue.year += total;
    });

    setRevenueData(revenue);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(() => {
        fetchOrders();
        setCurrentTime(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handlePaymentConfirm = (orderId) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status: 'Completed' })
      .then(() => {
        fetchOrders();
        setError(null);
      })
      .catch(err => {
        console.error('Error confirming payment:', err);
        setError('Failed to confirm payment.');
      });
  };

  const handlePrintBill = (order) => {
    const billContent = `
      GSaheb Cafe Bill
      --------------------
      Order #${order.orderNumber}
      Table: ${order.tableNumber}
      Date: ${new Date(order.createdAt).toLocaleString()}
      --------------------
      Items:
      ${order.items.map(item => 
        `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted Item]'} - ₹${(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)}`
      ).join('\n')}
      --------------------
      Total: ₹${order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2)}
      --------------------
      Thank you for dining with us!
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<pre>${billContent}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Order #', 'Table', 'Date', 'Items', 'Total', 'Status'],
      ...orders.map(order => [
        order.orderNumber,
        order.tableNumber,
        new Date(order.createdAt).toLocaleString(),
        order.items.map(item => `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted Item]'}`).join('; '),
        order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2),
        order.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCustomDateRange = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      const start = new Date(customDateRange.startDate);
      const end = new Date(customDateRange.endDate);
      end.setHours(23, 59, 59, 999);
      if (start <= end) {
        fetchOrders(start, end);
        setError(null);
      } else {
        setError('End date must be after start date.');
      }
    } else {
      setError('Please select both start and end dates.');
    }
  };

  const filteredOrders = activeTable === 'All'
    ? orders
    : orders.filter(order => order.tableNumber.toString() === activeTable);

  const chartData = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.toDateString() === date.toDateString();
    });
    const total = dayOrders.reduce((sum, order) => 
      sum + order.items.reduce((s, item) => s + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0), 0
    );
    chartData.push({
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: total
    });
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Payment Dashboard Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            {error && <p className="text-red-600 Gazzetta, serif text-sm mb-4">{error}</p>}
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Payment Dashboard - GSaheb Cafe
        </h1>
        <button
          className="px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: '#dc2626' }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {error && (
        <p className="text-center text-red-600 mb-4">{error}</p>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <FaClock className="text-gray-600" />
          <span className="text-gray-600">{currentTime.toLocaleString()}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={customDateRange.startDate}
            onChange={e => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="date"
            value={customDateRange.endDate}
            onChange={e => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
          />
          <button
            className="px-4 py-2 rounded-lg text-white flex items-center"
            style={{ backgroundColor: '#b45309' }}
            onClick={handleCustomDateRange}
          >
            <FaChartLine className="mr-2" /> Filter
          </button>
          <button
            className="px-4 py-2 rounded-lg text-white flex items-center"
            style={{ backgroundColor: '#4b5563' }}
            onClick={() => {
              setCustomDateRange({ startDate: '', endDate: '' });
              fetchOrders();
            }}
          >
            <FaTimes className="mr-2" /> Clear Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Today', value: revenueData.today },
          { label: 'This Week', value: revenueData.week },
          { label: 'This Month', value: revenueData.month },
          { label: 'This Year', value: revenueData.year }
        ].map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-4 flex items-center"
            style={{ backgroundColor: '#fef3c7' }}
          >
            <FaRupeeSign className="text-amber-600 text-2xl mr-3" />
            <div>
              <p className="text-gray-600 text-sm">{metric.label}</p>
              <p className="text-xl font-bold flex items-center">
                <FaRupeeSign className="mr-1" />{metric.value.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaTable className="mr-2" style={{ color: '#b45309' }} /> Filter by Table
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: activeTable === 'All' ? '#b45309' : '#fed7aa',
              color: activeTable === 'All' ? '#ffffff' : '#1f2937'
            }}
            onClick={() => setActiveTable('All')}
          >
            All Tables
          </button>
          {[...new Set(orders.map(order => order.tableNumber))].sort((a, b) => a - b).map(table => (
            <button
              key={table}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: activeTable === table.toString() ? '#b45309' : '#fed7aa',
                color: activeTable === table.toString() ? '#ffffff' : '#1f2937'
              }}
              onClick={() => setActiveTable(table.toString())}
            >
              Table {table}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaChartLine className="mr-2" style={{ color: '#b45309' }} /> Revenue Trend (Last 7 Days)
        </h2>
        <div className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [<FaRupeeSign className="inline mr-1" />, value.toFixed(2)]} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Orders
          </h2>
          <button
            className="px-4 py-2 rounded-lg text-white flex items-center"
            style={{ backgroundColor: '#4b5563' }}
            onClick={handleExportCSV}
          >
            <FaFileExport className="mr-2" /> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <p className="text-center col-span-full text-gray-600">No orders found.</p>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow-md p-4"
                style={{ backgroundColor: '#fef3c7' }}
              >
                <h3 className="text-lg font-semibold flex items-center">
                  <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Table {order.tableNumber} (Order #{order.orderNumber})
                </h3>
                <p className="text-gray-600 text-sm flex items-center">
                  <FaClock className="mr-2" /> Placed: {new Date(order.createdAt).toLocaleString()}
                </p>
                <ul className="mt-2 space-y-1">
                  {order.items.map((item, index) => (
                    <li key={index} className="text-gray-600 text-sm">
                      {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (<FaRupeeSign className="inline mr-1" />
                      {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                    </li>
                  ))}
                </ul>
                <p
                  className={`mt-2 text-sm font-medium ${
                    order.status === 'Pending'
                      ? 'text-red-600'
                      : order.status === 'Prepared'
                      ? 'text-green-600'
                      : 'text-blue-600'
                  }`}
                >
                  Status: {order.status}
                </p>
                <p className="mt-2 text-sm font-bold flex items-center">
                  Total: <FaRupeeSign className="ml-1 mr-1" />
                  {order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2)}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#2563eb' }}
                    onClick={() => handlePrintBill(order)}
                  >
                    <FaPrint className="mr-2" /> Print Bill
                  </button>
                  {order.status !== 'Completed' && (
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#16a34a' }}
                      onClick={() => handlePaymentConfirm(order._id)}
                    >
                      <FaCheck className="mr-2" /> Confirm Payment
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentDashboard;