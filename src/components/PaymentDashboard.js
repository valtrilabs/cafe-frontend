import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FaRupeeSign, FaPrint, FaDownload, FaUtensils, FaList, FaFilter, FaCreditCard, FaMoneyBillWave, FaQrcode, FaChartPie, FaSearch } from 'react-icons/fa';
import ProtectedRoute from './ProtectedRoute';

function PaymentDashboard() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentAnalytics, setPaymentAnalytics] = useState({
    totalRevenue: 0,
    paymentMethods: [
      { name: 'Cash', value: 0 },
      { name: 'Card', value: 0 },
      { name: 'UPI', value: 0 },
    ],
  });
  const printRef = useRef();

  // Fetch orders
  const fetchOrders = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const url = `${process.env.REACT_APP_API_URL}/api/orders?dateFrom=${todayStart.toISOString()}&dateTo=${todayEnd.toISOString()}`;
    axios
      .get(url)
      .then((res) => {
        const sortedOrders = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
        updateAnalytics(sortedOrders);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  // Update payment analytics
  const updateAnalytics = (orders) => {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + (item.itemId ? item.quantity * item.itemId.price : 0), 0),
      0
    );
    const paymentMethods = [
      { name: 'Cash', value: 0 },
      { name: 'Card', value: 0 },
      { name: 'UPI', value: 0 },
    ];
    orders.forEach((order) => {
      if (order.paymentMethod) {
        const method = paymentMethods.find((m) => m.name === order.paymentMethod);
        if (method) {
          method.value += order.items.reduce((s, item) => s + (item.itemId ? item.quantity * item.itemId.price : 0), 0);
        }
      }
    });
    setPaymentAnalytics({
      totalRevenue,
      paymentMethods: paymentMethods.filter((m) => m.value > 0),
    });
  };

  // Filter orders based on tab, search, and date range
  const filterOrders = () => {
    let result = [...orders];
    if (activeTab !== 'All') {
      result = result.filter((order) => order.status === activeTab);
    }
    if (searchQuery) {
      result = result.filter(
        (order) =>
          order.orderNumber.toString().includes(searchQuery) ||
          order.tableNumber.toString().includes(searchQuery) ||
          order.items.some((item) => item.itemId && item.itemId.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= from && createdAt <= to;
      });
    }
    setFilteredOrders(result);
    updateAnalytics(result);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterOrders();
  }, [activeTab, searchQuery, dateFrom, dateTo, orders]);

  // Handle payment update
  const handlePaymentUpdate = (orderId, paymentMethod) => {
    axios
      .put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, {
        status: 'Completed',
        paymentMethod,
      })
      .then(() => {
        fetchOrders();
      })
      .catch((err) => {
        console.error('Error updating payment:', err);
        setError('Failed to update payment.');
      });
  };

  // Handle CSV export
  const handleExport = () => {
    if (!dateFrom || !dateTo) {
      setError('Please select both start and end dates.');
      return;
    }
    const url = `${process.env.REACT_APP_API_URL}/api/orders/export?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    window.location.href = url;
  };

  // Handle receipt printing (updated for 80mm thermal printer)
  const handlePrintReceipt = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order #${order.orderNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                width: 80mm;
                margin: 0;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                line-height: 1.3;
                color: #000;
              }
              .receipt {
                padding: 5mm;
                text-align: center;
                width: 100%;
                box-sizing: border-box;
              }
              .header {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5mm;
                border-bottom: 1px dashed #000;
                padding-bottom: 2mm;
              }
              .order-info {
                text-align: left;
                margin-bottom: 5mm;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2mm;
                text-align: left;
              }
              .item-name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .item-price {
                width: 60px;
                text-align: right;
              }
              .total {
                font-weight: bold;
                border-top: 1px dashed #000;
                padding-top: 3mm;
                margin-top: 5mm;
                display: flex;
                justify-content: space-between;
              }
              .footer {
                margin-top: 5mm;
                font-size: 10px;
                border-top: 1px dashed #000;
                padding-top: 2mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">GSaheb Cafe</div>
            <div class="order-info">
              <p>Order #${order.orderNumber}</p>
              <p>Table: ${order.tableNumber}</p>
              <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
              <p>Status: ${order.status}</p>
              <p>Payment: ${order.paymentMethod || 'Pending'}</p>
            </div>
            ${order.items
              .map(
                (item) => `
                  <div class="item">
                    <span class="item-name">${item.quantity} x ${
                  item.itemId ? item.itemId.name : '[Deleted Item]'
                }</span>
                    <span class="item-price">₹${(
                      item.quantity * (item.itemId ? item.itemId.price : 0)
                    ).toFixed(2)}</span>
                  </div>
                `
              )
              .join('')}
            <div class="total">
              <span>Total</span>
              <span>₹${order.items
                .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                .toFixed(2)}</span>
            </div>
            <div class="footer">
              Thank you for dining with us!<br />
              GSaheb Cafe - Taste the Tradition
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 flex items-center justify-center">
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Payment Dashboard - GSaheb Cafe
        </h1>

        {error && <p className="text-center text-red-600 mb-4">{error}</p>}

        {/* Tabs for Filtering */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6">
          {['All', 'Pending', 'Prepared', 'Completed'].map((tab) => (
            <button
              key={tab}
              className="flex items-center px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab ? '#b45309' : '#fed7aa',
                color: activeTab === tab ? '#ffffff' : '#1f2937',
                boxShadow: activeTab === tab ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
              }}
              onClick={() => setActiveTab(tab)}
            >
              <FaFilter className="mr-2" />
              {tab}
            </button>
          ))}
        </div>

        {/* Search and Date Range Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaFilter className="mr-2" style={{ color: '#b45309' }} /> Filter Orders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium">Search Orders</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-amber-500"
                  placeholder="Search by order #, table, or item"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium">Start Date</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium">End Date</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#b45309' }}
                onClick={handleExport}
              >
                <FaDownload className="mr-2" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Payment Analytics */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaChartPie className="mr-2" style={{ color: '#b45309' }} /> Payment Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <FaRupeeSign className="mr-2" /> Total Revenue
              </h3>
              <p className="text-2xl font-bold flex items-center">
                <FaRupeeSign className="mr-1" />
                {paymentAnalytics.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <FaChartPie className="mr-2" /> Payment Method Breakdown
              </h3>
              {paymentAnalytics.paymentMethods.length === 0 ? (
                <p className="text-gray-600">No payment data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentAnalytics.paymentMethods}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {paymentAnalytics.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaList className="mr-2" style={{ color: '#b45309' }} /> Orders
          </h2>
          {filteredOrders.length === 0 ? (
            <p className="text-gray-600">No orders found.</p>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="p-4 rounded-lg shadow-sm"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">
                        Order #{order.orderNumber} - Table {order.tableNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Placed at {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        order.status === 'Pending'
                          ? 'text-red-600'
                          : order.status === 'Prepared'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (
                        <FaRupeeSign className="inline mr-1" />
                        {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-bold flex items-center">
                    Total: <FaRupeeSign className="ml-1 mr-1" />
                    {order.items
                      .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                      .toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Payment Method: {order.paymentMethod || 'Pending'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status !== 'Completed' && (
                      <>
                        <button
                          className="px-3 py-1 rounded-lg text-white text-sm flex items-center"
                          style={{ backgroundColor: '#16a34a' }}
                          onClick={() => handlePaymentUpdate(order._id, 'Cash')}
                        >
                          <FaMoneyBillWave className="mr-1" /> Paid (Cash)
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-white text-sm flex items-center"
                          style={{ backgroundColor: '#3b82f6' }}
                          onClick={() => handlePaymentUpdate(order._id, 'Card')}
                        >
                          <FaCreditCard className="mr-1" /> Paid (Card)
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-white text-sm flex items-center"
                          style={{ backgroundColor: '#8b5cf6' }}
                          onClick={() => handlePaymentUpdate(order._id, 'UPI')}
                        >
                          <FaQrcode className="mr-1" /> Paid (UPI)
                        </button>
                      </>
                    )}
                    <button
                      className="px-3 py-1 rounded-lg text-white text-sm flex items-center"
                      style={{ backgroundColor: '#f59e0b' }}
                      onClick={() => handlePrintReceipt(order)}
                    >
                      <FaPrint className="mr-1" /> Print Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default PaymentDashboard;