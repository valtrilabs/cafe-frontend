import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { FaFileExport, FaRupeeSign, FaChartBar, FaUtensils, FaTable, FaClock, FaChartLine, FaCreditCard, FaUsers, FaCheckCircle } from 'react-icons/fa';

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
  const [activeTab] = useState('Analytics');
  const [analytics, setAnalytics] = useState({
    revenue: { today: 0, week: 0, month: 0 },
    orderCounts: {
      today: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
      week: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
      month: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
      year: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 }
    },
    topItems: [],
    peakHours: [],
    categories: [],
    paymentMethods: {},
    repeatOrderPercentage: 0
  });

  const fetchOrders = () => {
    axios.get('https://cafe-backend-ay2n.onrender.com/api/orders')
      .then(res => {
        console.log('Orders fetched:', res.data);
        const sortedOrders = res.data
          .filter(order => order.tableNumber != null)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/analytics');
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
      if (order.status === 'Paid') {
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

  const markAsPaid = async (orderId) => {
    try {
      await axios.post(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}/paid`);
      fetchOrders();
      fetchAnalytics();
    } catch (err) {
      console.error('Error marking order as paid:', err);
      setError('Failed to mark order as paid.');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchOrders();
      fetchAnalytics();
    }, 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return (
        orderDate.getDate() === date.getDate() &&
        orderDate.getMonth() === date.getMonth() &&
        orderDate.getFullYear() === date.getFullYear() &&
        o.status === 'Paid'
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

  const calculateAOV = () => {
    const periods = [
      { name: 'today', start: new Date().setHours(0, 0, 0, 0) },
      { name: 'week', start: new Date().setDate(new Date().getDate() - new Date().getDay()) },
      { name: 'month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      { name: 'year', start: new Date(new Date().getFullYear(), 0, 1) }
    ];

    return periods.map(period => {
      const periodOrders = orders.filter(o => new Date(o.createdAt) >= new Date(period.start) && o.status === 'Paid');
      const totalRevenue = periodOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity * (i.itemId ? i.itemId.price : 0)), 0),
        0
      );
      const orderCount = periodOrders.length;
      return {
        label: period.name.charAt(0).toUpperCase() + period.name.slice(1),
        value: orderCount ? (totalRevenue / orderCount).toFixed(2) : 0,
        color: period.name === 'today' ? '#fef3c7' : period.name === 'week' ? '#ffedd5' : period.name === 'month' ? '#fee2e2' : '#e9d5ff'
      };
    });
  };

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

  const totalCategoryRevenue = analytics.categories.reduce((sum, cat) => sum + cat.revenue, 0);

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

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center text-gray-800">
          <FaChartBar className="mr-2 text-amber-600" /> Analytics
        </h2>
        
        <div className="mb-6">
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
            style={{ backgroundColor: '#b45309' }}
            onClick={exportRevenueCSV}
          >
            <FaFileExport className="mr-2" /> Export Revenue as CSV
          </button>
        </div>

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

        {[
          { period: 'Today', data: analytics.orderCounts.today },
          { period: 'This Week', data: analytics.orderCounts.week },
          { period: 'This Month', data: analytics.orderCounts.month },
          { period: 'This Year', data: analytics.orderCounts.year }
        ].map((period, index) => (
          <div key={index} className="mb-8 border-b-2 border-gray-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
              <FaTable className="mr-2" /> {period.period}’s Orders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: period.data.total, icon: <FaTable className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' },
                { label: 'Pending', value: period.data.pending, icon: <FaClock className="mr-3 text-red-600 text-xl" />, color: '#ffedd5' },
                { label: 'Prepared', value: period.data.prepared, icon: <FaChartLine className="mr-3 text-green-600 text-xl" />, color: '#fee2e2' },
                { label: 'Completed', value: period.data.completed, icon: <FaChartLine className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' },
                { label: 'Paid', value: period.data.paid, icon: <FaRupeeSign className="mr-3 text-green-600 text-xl" />, color: '#e9d5ff' }
              ].map((metric, i) => (
                <div
                  key={i}
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
        ))}

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaUtensils className="mr-2" /> Recent Orders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.slice(0, 6).map(order => (
              <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
                <h4 className="text-md font-semibold">Order #{order.orderNumber} - Table {order.tableNumber}</h4>
                <p className="text-gray-600 text-sm">Status: {order.status}</p>
                <ul className="mt-2 space-y-1">
                  {order.items.map(item => (
                    <li key={item.itemId._id} className="text-sm">
                      {item.quantity} x {item.itemId.name} (<FaRupeeSign className="inline mr-1" />{(item.quantity * item.itemId.price).toFixed(2)})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-bold">
                  Total: <FaRupeeSign className="inline mr-1" />
                  {order.items.reduce((sum, item) => sum + item.quantity * item.itemId.price, 0).toFixed(2)}
                </p>
                {order.status !== 'Paid' && (
                  <button
                    className="mt-2 w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
                    style={{ backgroundColor: '#b45309' }}
                    onClick={() => markAsPaid(order._id)}
                  >
                    <FaCheckCircle className="mr-2" /> Mark as Paid
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaUtensils className="mr-2" /> Top 5 Items (This Month)
          </h3>
          {analytics.topItems.length === 0 ? (
            <p className="text-gray-600">No data available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.topItems.map((item, index) => (
                <div key={index} className="p-4 rounded-lg shadow-sm" style={{ backgroundColor: '#fef3c7' }}>
                  <p className="text-gray-800 font-medium">{item.name}</p>
                  <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                  <p className="text-gray-600 text-sm flex items-center">
                    Revenue: <FaRupeeSign className="ml-1 mr-1" />{item.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaChartLine className="mr-2" /> Revenue Trend (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaChartBar className="mr-2" /> Peak Hours (Today)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.peakHours} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'Orders']} />
              <Bar dataKey="orders" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaCreditCard className="mr-2" /> Payment Methods
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.paymentMethods).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#f59e0b"
                dataKey="value"
                label
              >
                {Object.entries(analytics.paymentMethods).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaUsers className="mr-2" /> Average Order Value
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {calculateAOV().map((aov, index) => (
              <div
                key={index}
                className="p-4 rounded-lg shadow-sm transition-colors flex items-center hover:bg-amber-50"
                style={{ backgroundColor: aov.color }}
              >
                <FaRupeeSign className="mr-3 text-green-600 text-xl" />
                <div>
                  <p className="text-gray-600 text-sm">{aov.label}</p>
                  <p className="text-xl sm:text-2xl font-bold flex items-center text-gray-800">
                    <FaRupeeSign className="mr-1" />{aov.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaUtensils className="mr-2" /> Category Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categories} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <FaUsers className="mr-2" /> Repeat Order Rate
          </h3>
          <p className="text-gray-600">
            Repeat Order Percentage: <span className="font-bold">{analytics.repeatOrderPercentage}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentDashboard;