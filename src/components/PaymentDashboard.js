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

  const fetchOrders = () => {
    axios.get('https://cafe-backend-ay2n.onrender.com/api/orders')
      .then(res => {
        console.log('Orders fetched:', res.data);
        // Sort orders by createdAt descending (newest first)
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

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const handleMarkPaid = (orderId) => {
    axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`, { status: 'Completed' })
      .then(() => {
        fetchOrders();
      })
      .catch(err => {
        console.error('Error marking paid:', err);
        setError('Failed to mark as paid.');
      });
  };

  const handlePrintReceipt = (order) => {
    const receiptWindow = window.open('', '_blank');
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
          <p class="subtitle">[Your Cafe Tagline]</p>
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
              <td class="total">₹${order.items
                .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                .toFixed(2)}</td>
            </tr>
          </table>
          <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
          <p>Status: ${order.status}</p>
          <p class="custom-field">[Custom Field 1: e.g., GSTIN]</p>
          <p class="custom-field">[Custom Field 2: e.g., Contact Info]</p>
          <div class="footer">
            <p>Thank you for dining at GSaheb Cafe!</p>
            <p>[Footer Note]</p>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  // Chart data for weekly revenue
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

  // Unique table numbers plus Paid Bills
  const tableNumbers = ['All', 'Paid Bills', ...Array.from(new Set(orders.map(order => order.tableNumber.toString()))).sort((a, b) => a - b)];

  // Filter orders by active table
  const filteredOrders = activeTable === 'All'
    ? orders.filter(order => order.status !== 'Completed')
    : activeTable === 'Paid Bills'
    ? orders.filter(order => order.status === 'Completed')
    : orders.filter(order => order.tableNumber.toString() === activeTable && order.status !== 'Completed');

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 flex items-center justify-center">
        <FaRupeeSign className="mr-2" style={{ color: '#b45309' }} /> Payment Dashboard - GSaheb Cafe
      </h1>
      <p className="text-center text-gray-600 mb-6 flex items-center justify-center text-sm sm:text-base">
        <FaClock className="mr-2" /> Current Time: {currentTime.toLocaleString()}
      </p>

      {error && (
        <p className="text-center text-red-600 mb-4">{error}</p>
      )}

      {/* Table Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6">
        {tableNumbers.map(table => (
          <button
            key={table}
            className="flex items-center px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors"
            style={{
              backgroundColor: activeTable === table ? '#b45309' : '#fed7aa',
              color: activeTable === table ? '#ffffff' : '#1f2937',
              boxShadow: activeTable === table ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onClick={() => setActiveTable(table)}
          >
            <FaTable className="mr-2" /> {table === 'Paid Bills' ? 'Paid Bills' : `Table ${table}`}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Orders
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {filteredOrders.length === 0 ? (
          <p className="text-center col-span-full text-gray-600">No orders for {activeTable === 'Paid Bills' ? 'Paid Bills' : `Table ${activeTable}`}.</p>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold flex items-center">
                <FaTable className="mr-2" style={{ color: '#b45309' }} /> Table {order.tableNumber} (Order #{order.orderNumber})
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
              <p className="font-bold mt-2 flex items-center text-sm sm:text-base">
                <FaRupeeSign className="mr-2" /> Total: 
                {order.items
                  .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                  .toFixed(2)}
              </p>
              <p
                className={`mt-2 text-sm ${
                  order.status === 'Pending'
                    ? 'text-red-600'
                    : order.status === 'Prepared'
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}
              >
                Status: {order.status}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
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
                  onClick={() => handlePrintReceipt(order)}
                >
                  <FaPrint className="mr-2" /> Print Receipt
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaRupeeSign className="mr-2" style={{ color: '#b45309' }} /> Revenue Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today', value: revenueData.today, color: '#fef3c7', iconColor: '#2563eb' },
            { label: 'This Week', value: revenueData.week, color: '#ffedd5', iconColor: '#16a34a' },
            { label: 'This Month', value: revenueData.month, color: '#fee2e2', iconColor: '#d97706' },
            { label: 'This Year', value: revenueData.year, color: '#e9d5ff', iconColor: '#7c3aed' }
          ].map((metric, index) => (
            <div
              key={index}
              className="p-4 rounded-lg shadow-sm transition-colors flex items-center"
              style={{ backgroundColor: metric.color }}
            >
              <FaRupeeSign className="mr-3 text-xl" style={{ color: metric.iconColor }} />
              <div>
                <p className="text-gray-600 text-sm">{metric.label}</p>
                <p className="text-xl sm:text-2xl font-bold flex items-center">
                  <FaRupeeSign className="mr-1" />{metric.value.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t-2 border-amber-200 pt-4">
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
            style={{ backgroundColor: '#b45309' }}
            onClick={exportRevenueCSV}
          >
            <FaFileExport className="mr-2" /> Export Revenue as CSV
          </button>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
          <FaChartLine className="mr-2" style={{ color: '#b45309' }} /> Weekly Revenue Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [<FaRupeeSign className="inline mr-1" />, value.toFixed(2)]} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#f59e0b" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PaymentDashboard;