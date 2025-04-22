import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { FaPrint, FaCheck, FaUtensils, FaClock, FaChartLine, FaFileExport, FaTable, FaRupeeSign, FaChartBar } from 'react-icons/fa';

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
  const [activeTab, setActiveTab] = useState('Orders');
  const [analytics, setAnalytics] = useState({
    revenue: { today: 0, week: 0, month: 0 },
    orderCount: { total: 0, pending: 0, prepared: 0, completed: 0 },
    topItems: [],
    slowItems: [],
    peakHours: [],
    categories: []
  });

  const fetchOrders = () => {
    axios.get('https://cafe-backend-ay2n.onrender.com/api/orders')
      .then(res => {
        console.log('Orders fetched:', res.data);
        const sortedOrders = res.data
          .filter(order => order.tableNumber != null) // Filter out orders with undefined/null tableNumber
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Log invalid orders for debugging
        const invalidOrders = res.data.filter(order => order.tableNumber == null);
        if (invalidOrders.length > 0) {
          console.warn('Invalid orders (missing tableNumber):', invalidOrders);
        }
        setOrders(sortedOrders);
        calculateRevenue(sortedOrders);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/orders/analytics');
      console.log('Analytics fetched:', res.data);
      setAnalytics(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics.');
    }
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
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchOrders();
      if (activeTab === 'Analytics') fetchAnalytics();
    }, 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [activeTab]);

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
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { 
                margin: 0; 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.2; 
                width: 80mm; 
                color: #000; 
                background: #fff; 
              }
              .container { padding: 5mm; text-align: center; }
              .header { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              .table-row { display: flex; justify-content: space-between; }
              .table-row.header { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; }
              .item-name { text-align: left; width: 50%; overflow-wrap: break-word; }
              .item-qty { text-align: center; width: 15%; }
              .item-total { text-align: right; width: 35%; }
              .total { font-weight: bold; margin-top: 5px; }
              .footer { margin-top: 10px; font-size: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">GSaheb Cafe</div>
            <div>Table ${order.tableNumber} | Order #${order.orderNumber}</div>
            <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
            <div class="divider"></div>
            <div class="table-row header">
              <span class="item-name">Item</span>
              <span class="item-qty">Qty</span>
              <span class="item-total">Total</span>
            </div>
            ${order.items
              .map(
                item => `
                  <div class="table-row">
                    <span class="item-name">${item.itemId ? item.itemId.name : '[Deleted Item]'}</span>
                    <span class="item-qty">${item.quantity}</span>
                    <span class="item-total">₹${item.itemId ? (item.quantity * item.itemId.price).toFixed(2) : '0.00'}</span>
                  </div>
                `
              )
              .join('')}
            <div class="divider"></div>
            <div class="table-row total">
              <span class="item-name">Total</span>
              <span class="item-qty"></span>
              <span class="item-total">₹${order.items
                .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                .toFixed(2)}</span>
            </div>
            <div class="footer">Thank you for dining at GSaheb Cafe!</div>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
    receiptWindow.close();
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

  const filteredOrders = activeTable === 'All'
    ? orders.filter(order => order.status !== 'Completed')
    : activeTable === 'Paid Bills'
    ? orders.filter(order => order.status === 'Completed')
    : orders.filter(order => order.tableNumber.toString() === activeTable && order.status !== 'Completed');

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 flex items-center justify-center">
        <FaRupeeSign className="mr-2" style={{ color: '#b45309' }} /> Payment Dashboard - GSaheb Cafe
      </h1>
      <p className="text-center text-gray-600 mb-6 flex items-center justify-center text-sm sm:text-base">
        <FaClock className="mr-2" /> Current Time: {currentTime.toLocaleString()}
      </p>

      {error && (
        <p className="text-center text-red-600 mb-4 bg-red-100 p-3 rounded-lg">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 bg-white rounded-lg shadow-md p-4">
        {[
          { name: 'Orders', icon: <FaUtensils /> },
          { name: 'Analytics', icon: <FaChartBar /> }
        ].map(tab => (
          <button
            key={tab.name}
            className="flex items-center px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors hover:bg-amber-100"
            style={{
              backgroundColor: activeTab === tab.name ? '#b45309' : '#ffffff',
              color: activeTab === tab.name ? '#ffffff' : '#1f2937',
              boxShadow: activeTab === tab.name ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onClick={() => setActiveTab(tab.name)}
            aria-label={`Switch to ${tab.name} tab`}
          >
            {tab.icon}
            <span className="ml-2">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'Orders' && (
        <>
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
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-green-700 transition-colors"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleMarkPaid(order._id)}
                      >
                        <FaCheck className="mr-2" /> Mark as Paid
                      </button>
                    )}
                    <button
                      className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-blue-700 transition-colors"
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
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
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
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'Analytics' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center text-gray-800">
            <FaChartBar className="mr-2 text-amber-600" /> Analytics
          </h2>
          
          {/* Revenue */}
          <div className="mb-8 border-b-2 border-gray-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
              <FaRupeeSign className="mr-2" /> Revenue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Today', value: analytics.revenue.today, color: '#fef3c7' },
                { label: 'This Week', value: analytics.revenue.week, color: '#ffedd5' },
                { label: 'This Month', value: analytics.revenue.month, color: '#fee2e2' }
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg shadow-sm transition-colors flex items-center hover:bg-amber-50"
                  style={{ backgroundColor: metric.color }}
                >
                  <FaRupeeSign className="mr-3 text-green-600 text-xl" />
                  <div>
                    <p className="text-gray-600 text-sm">{metric.label}</p>
                    <p className="text-xl sm:text-2xl font-bold flex items-center text-gray-800">
                      <FaRupeeSign className="mr-1" />{metric.value.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Count */}
          <div className="mb-8 border-b-2 border-gray-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
              <FaTable className="mr-2" /> Today’s Orders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: analytics.orderCount.total, icon: <FaTable className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' },
                { label: 'Pending', value: analytics.orderCount.pending, icon: <FaClock className="mr-3 text-red-600 text-xl" />, color: '#ffedd5' },
                { label: 'Prepared', value: analytics.orderCount.prepared, icon: <FaCheck className="mr-3 text-green-600 text-xl" />, color: '#fee2e2' },
                { label: 'Completed', value: analytics.orderCount.completed, icon: <FaCheck className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' }
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg shadow-sm transition-colors flex items-center hover:bg-amber-50"
                  style={{ backgroundColor: metric.color }}
                >
                  {metric.icon}
                  <div>
                    <p className="text-gray-600 text-sm">{metric.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Items */}
          <div className="mb-8 border-b-2 border-gray-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
              <FaUtensils className="mr-2" /> Top 5 Items (This Month)
            </h3>
            {analytics.topItems.length === 0 ? (
              <p className="text-gray-600">No data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.topItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg shadow-sm transition-colors flex items-center hover:bg-amber-50"
                    style={{ backgroundColor: '#fef3c7' }}
                  >
                    <FaRupeeSign className="mr-3 text-green-600 text-xl" />
                    <div>
                      <p className="text-gray-800 font-medium">{item.name}</p>
                      <p className="text-gray-600 text-sm">
                        {item.quantity} sold (<FaRupeeSign className="inline mr-1" />{item.revenue.toFixed(2)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slow-Moving Items */}
          <div className="mb-8 border-b-2 border-gray-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
              <FaUtensils className="mr-2" /> Slow-Moving Items (This Week)
            </h3>
            {analytics.slowItems.length === 0 ? (
              <p className="text-gray-600">No data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.slowItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg shadow-sm transition-colors flex items-center hover:bg-amber-50"
                    style={{ backgroundColor: '#ffedd5' }}
                  >
                    <FaRupeeSign className="mr-3 text-red-600 text-xl" />
                    <div>
                      <p className="text-gray-800 font-medium">{item.name}</p>
                      <p className="text-gray-600 text-sm">{item.quantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div className="p-4 rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
                <FaClock className="mr-2" /> Peak Hours (Today)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Performance */}
            <div className="p-4 rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
                <FaChartBar className="mr-2" /> Category Performance (This Month)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categories}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {analytics.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [<FaRupeeSign className="inline mr-1" />, value.toFixed(2)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentDashboard;