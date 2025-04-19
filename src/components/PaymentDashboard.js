import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaPrint, FaCheck, FaUtensils, FaClock, FaChartLine, FaFileExport, FaTable, FaRupeeSign, FaCalendar } from 'react-icons/fa';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [exportRange, setExportRange] = useState({
    startDate: '',
    endDate: ''
  });

  const STATIC_PASSWORD = 'Gsaheb2025';

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
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders`)
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
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const revenue = {
      today: 0,
      week: 0,
      month: 0,
      year: 0
    };

    orders.forEach(order => {
      if (order.status === 'Completed') {
        const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0);
        const orderDate = new Date(order.createdAt);
        if (orderDate >= todayStart) revenue.today += total;
        if (orderDate >= weekStart) revenue.week += total;
        if (orderDate >= monthStart) revenue.month += total;
        if (orderDate >= yearStart) revenue.year += total;
      }
    });

    setRevenueData(revenue);
  };

  const exportRevenueCSV = () => {
    const csvContent = [
      ['Period', 'Revenue (₹)'],
      ['Today', revenueData.today.toFixed(2)],
      ['This Week', revenueData.week.toFixed(2)],
      ['This Month', revenueData.month.toFixed(2)],
      ['This Year', revenueData.year.toFixed(2)]
    ]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSahebCafe_Revenue_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCustomRangeCSV = () => {
    if (!exportRange.startDate || !exportRange.endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    const start = new Date(exportRange.startDate);
    const end = new Date(exportRange.endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    if (start > end) {
      setError('Start date must be before end date.');
      return;
    }

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    const csvContent = [
      ['Order #', 'Table Number', 'Items', 'Quantity', 'Total Amount (₹)', 'Date & Time', 'Status'],
      ...filteredOrders.map(order => [
        order.orderNumber,
        order.tableNumber,
        order.items.map(item => `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted Item]'}`).join('; '),
        order.items.reduce((sum, item) => sum + item.quantity, 0),
        order.items.reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0).toFixed(2),
        new Date(order.createdAt).toLocaleString(),
        order.status
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSahebCafe_Orders_${exportRange.startDate}_${exportRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => {
        clearInterval(interval);
        clearInterval(timeInterval);
      };
    }
  }, [isAuthenticated]);

  const handleMarkPaid = (orderId) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status: 'Completed' })
      .then(() => {
        fetchOrders();
      })
      .catch(err => {
        console.error('Error marking paid:', err);
        setError('Failed to mark as paid.');
      });
  };

  const handlePrintReceipt = (order, isThermal = false) => {
    const receiptWindow = window.open('', '_blank');
    const total = order.items
      .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
      .toFixed(2);

    if (isThermal) {
      // Thermal receipt (80mm width, ~300px at 96dpi)
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - GSaheb Cafe</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                width: 300px; 
                margin: 0; 
                padding: 10px; 
                font-size: 12px; 
                line-height: 1.2; 
              }
              h1 { font-size: 16px; text-align: center; margin: 5px 0; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 2px 0; }
              .total { font-weight: bold; }
              .footer { text-align: center; font-size: 10px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h1>GSaheb Cafe</h1>
            <div class="divider"></div>
            <p>Table ${order.tableNumber} | Order #${order.orderNumber}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
            <div class="divider"></div>
            <table>
              ${order.items
                .map(
                  item => `
                    <tr>
                      <td>${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted Item]'}</td>
                      <td style="text-align: right;">₹${item.itemId ? (item.quantity * item.itemId.price).toFixed(2) : '0.00'}</td>
                    </tr>
                  `
                )
                .join('')}
              <tr><td colspan="2" class="divider"></td></tr>
              <tr>
                <td class="total">Total</td>
                <td class="total" style="text-align: right;">₹${total}</td>
              </tr>
            </table>
            <div class="divider"></div>
            <div class="footer">
              <p>Thank you for dining with us!</p>
            </div>
          </body>
        </html>
      `);
    } else {
      // A4 receipt
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - GSaheb Cafe</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              .subtitle { text-align: center; font-style: italic; color: #555; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; }
              .custom-field { color: #777; }
            </style>
          </head>
          <body>
            <h1>GSaheb Cafe</h1>
            <p class="subtitle">Fresh Food, Made with Love</p>
            <p style="text-align: center;">Table ${order.tableNumber} | Order #${order.orderNumber}</p>
            <table>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
              ${order.items
                .map(
                  item => `
                    <tr>
                      <td>${item.itemId ? item.itemId.name : '[Deleted Item]'}</td>
                      <td>${item.quantity}</td>
                      <td>₹${item.itemId ? item.itemId.price.toFixed(2) : '0.00'}</td>
                      <td>₹${item.itemId ? (item.quantity * item.itemId.price).toFixed(2) : '0.00'}</td>
                    </tr>
                  `
                )
                .join('')}
              <tr>
                <td colspan="3" class="total">Total</td>
                <td class="total">₹${total}</td>
              </tr>
            </table>
            <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
            <p>Status: ${order.status}</p>
            <p class="custom-field">GSTIN: [Your GSTIN]</p>
            <p class="custom-field">Contact: +91-1234567890</p>
            <div class="footer">
              <p>Thank you for dining at GSaheb Cafe!</p>
              <p>Visit again!</p>
            </div>
          </body>
        </html>
      `);
    }
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return (
        orderDate.getDate() === date.getDate() &&
        orderDate.getMonth() === date.getMonth() &&
        orderDate.getFullYear() === date.getFullYear() &&
        o.status === 'Completed'
      );
    });
    const revenue = dayOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + (i.itemId ? i.quantity * i.itemId.price : 0), 0),
      0
    );
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue
    };
  }).reverse();

  const tableNumbers = ['All', 'Paid Bills', ...Array.from(new Set(orders.map(order => order.tableNumber.toString()))).sort((a, b) => a - b)];

  const filteredOrders = orders.filter(order => {
    if (activeTable === 'All') return true;
    if (activeTable === 'Paid Bills') return order.status === 'Completed';
    return order.tableNumber.toString() === activeTable;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Payment Dashboard Login</h1>
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
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Payment Dashboard - GSaheb Cafe
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2 sm:mt-0">
          <FaClock className="inline mr-2" /> {currentTime.toLocaleString()}
        </p>
      </div>

      {error && (
        <p className="text-center text-red-600 mb-4">{error}</p>
      )}

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Today', value: revenueData.today, color: '#fef3c7' },
          { label: 'This Week', value: revenueData.week, color: '#ffedd5' },
          { label: 'This Month', value: revenueData.month, color: '#fee2e2' },
          { label: 'This Year', value: revenueData.year, color: '#e0f2fe' },
        ].map((metric, index) => (
          <div
            key={index}
            className="p-4 rounded-lg shadow-sm"
            style={{ backgroundColor: metric.color }}
          >
            <p className="text-gray-600 text-sm">{metric.label}</p>
            <p className="text-xl sm:text-2xl font-bold flex items-center">
              <FaRupeeSign className="mr-1" />{metric.value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaChartLine className="mr-2" style={{ color: '#b45309' }} /> Revenue Trend (Last 7 Days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [<FaRupeeSign className="inline mr-1" />, value.toFixed(2)]} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#f59e0b" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaFileExport className="mr-2" style={{ color: '#b45309' }} /> Export Data
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            className="px-4 py-2 rounded-lg text-white flex items-center"
            style={{ backgroundColor: '#b45309' }}
            onClick={exportRevenueCSV}
          >
            <FaFileExport className="mr-2" /> Export Revenue Summary
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={exportRange.startDate}
              onChange={e => setExportRange({ ...exportRange, startDate: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="date"
              value={exportRange.endDate}
              onChange={e => setExportRange({ ...exportRange, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
            <button
              className="px-4 py-2 rounded-lg text-white flex items-center"
              style={{ backgroundColor: '#16a34a' }}
              onClick={exportCustomRangeCSV}
            >
              <FaCalendar className="mr-2" /> Export Custom Range
            </button>
          </div>
        </div>
      </div>

      {/* Table Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tableNumbers.map(table => (
          <button
            key={table}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: activeTable === table ? '#b45309' : '#fed7aa',
              color: activeTable === table ? '#ffffff' : '#1f2937'
            }}
            onClick={() => setActiveTable(table)}
          >
            <FaTable className="inline mr-2" />
            {table}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredOrders.length === 0 ? (
          <p className="text-center col-span-full text-gray-600">No orders found for this filter.</p>
        ) : (
          filteredOrders.map(order => (
            <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Table {order.tableNumber} (Order #{order.orderNumber})
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
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {order.status !== 'Completed' && (
                  <button
                    className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => handleMarkPaid(order._id)}
                  >
                    <FaCheck className="mr-2" /> Mark as Paid
                  </button>
                )}
                <button
                  className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                  style={{ backgroundColor: '#2563eb' }}
                  onClick={() => handlePrintReceipt(order, false)}
                >
                  <FaPrint className="mr-2" /> Print A4 Receipt
                </button>
                <button
                  className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                  style={{ backgroundColor: '#d97706' }}
                  onClick={() => handlePrintReceipt(order, true)}
                >
                  <FaPrint className="mr-2" /> Print Thermal Receipt
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PaymentDashboard;