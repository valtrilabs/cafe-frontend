import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaChartBar, FaUtensils, FaList, FaClock, FaHamburger, FaArrowUp, FaArrowDown, FaRupeeSign, FaSearch } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Today');
  const [editingOrder, setEditingOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    isAvailable: true,
    image: null,
  });
  const [analytics, setAnalytics] = useState({
    revenue: { today: 0, week: 0, month: 0 },
    orderCount: { total: 0, pending: 0, prepared: 0, completed: 0 },
    topItems: [],
    slowItems: [],
    peakHours: [],
    categories: []
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [manualOrder, setManualOrder] = useState({
    tableNumber: '',
    items: [],
    searchQuery: ''
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

  const fetchOrders = (tab) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const url = tab === 'Today'
      ? `${process.env.REACT_APP_API_URL}/api/orders?dateFrom=${todayStart.toISOString()}&dateTo=${now.toISOString()}`
      : tab === 'Past Orders'
      ? `${process.env.REACT_APP_API_URL}/api/orders?dateTo=${todayStart.toISOString()}`
      : `${process.env.REACT_APP_API_URL}/api/orders?status=${tab.toLowerCase()}`;
    axios.get(url)
      .then(res => {
        console.log('Orders fetched:', res.data);
        const newOrders = res.data;
        const sortedOrders = newOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (orders.length > 0) {
          const currentIds = new Set(orders.map(o => o._id));
          const newIds = newOrders
            .filter(o => !currentIds.has(o._id))
            .map(o => o._id);
          if (newIds.length > 0) {
            setNewOrderIds(new Set(newIds));
            try {
              const audio = new Audio('/sounds/new-order.wav');
              audio.play().catch(err => console.error('Audio play failed:', err));
            } catch (err) {
              console.error('Audio error:', err);
            }
            setTimeout(() => {
              setNewOrderIds(new Set());
            }, 5000);
          }
        }
        setOrders(sortedOrders);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  const fetchMenuItems = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data);
      })
      .catch(err => {
        console.error('Error fetching menu:', err);
        setError('Failed to load menu items.');
      });
  };

  const fetchAnalytics = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders/analytics`)
      .then(res => {
        console.log('Analytics fetched:', res.data);
        setAnalytics(res.data);
      })
      .catch(err => {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics.');
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders('Today');
      fetchMenuItems();
      fetchAnalytics();
      const interval = setInterval(() => {
        fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
        if (activeTab === 'Analytics') fetchAnalytics();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isAuthenticated]);

  const handleStatusUpdate = (orderId, status) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status })
      .then(() => {
        fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
      })
      .catch(err => {
        console.error('Error updating order:', err);
        setError('Failed to update order.');
      });
  };

  const handleEditOrder = (order) => {
    const validItems = order.items
      .filter(item => item.itemId)
      .map(item => ({
        itemId: item.itemId._id,
        quantity: item.quantity,
        name: item.itemId.name,
        price: item.itemId.price
      }));
    setEditingOrder({
      ...order,
      items: validItems
    });
  };

  const handleSaveEdit = () => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${editingOrder._id}`, {
      tableNumber: editingOrder.tableNumber,
      items: editingOrder.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      })),
      status: editingOrder.status
    })
      .then(() => {
        fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
        setEditingOrder(null);
      })
      .catch(err => {
        console.error('Error saving order:', err);
        setError('Failed to save order.');
      });
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Cancel this order?')) {
      axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`)
        .then(() => {
          fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
        })
        .catch(err => {
          console.error('Error canceling order:', err);
          setError('Failed to cancel order.');
        });
    }
  };

  const handleAddMenuItem = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newItem.name);
    formData.append('category', newItem.category);
    formData.append('price', newItem.price);
    formData.append('description', newItem.description);
    formData.append('isAvailable', newItem.isAvailable);
    if (newItem.image) {
      formData.append('image', newItem.image);
    }

    axios.post(`${process.env.REACT_APP_API_URL}/api/menu`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then(() => {
        fetchMenuItems();
        setNewItem({
          name: '',
          category: '',
          price: '',
          description: '',
          isAvailable: true,
          image: null,
        });
        setError(null);
      })
      .catch(err => {
        console.error('Error adding menu item:', err);
        setError('Failed to add menu item. Ensure image is JPEG/PNG and under 5MB.');
      });
  };

  const handleDeleteMenuItem = (itemId) => {
    if (window.confirm('Delete this menu item?')) {
      axios.delete(`${process.env.REACT_APP_API_URL}/api/menu/${itemId}`)
        .then(() => {
          fetchMenuItems();
          setError(null);
        })
        .catch(err => {
          console.error('Error deleting menu item:', err);
          setError('Failed to delete menu item.');
        });
    }
  };

  const handleToggleAvailability = (itemId, isAvailable) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/menu/${itemId}`, { isAvailable: !isAvailable })
      .then(() => {
        fetchMenuItems();
        setError(null);
      })
      .catch(err => {
        console.error('Error updating availability:', err);
        setError('Failed to update availability.');
      });
  };

  const handleAddToManualOrder = (item) => {
    const existingItem = manualOrder.items.find(i => i.itemId === item._id);
    if (existingItem) {
      setManualOrder({
        ...manualOrder,
        items: manualOrder.items.map(i =>
          i.itemId === item._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      });
    } else {
      setManualOrder({
        ...manualOrder,
        items: [
          ...manualOrder.items,
          { itemId: item._id, name: item.name, price: item.price, quantity: 1 }
        ]
      });
    }
  };

  const handleRemoveFromManualOrder = (itemId) => {
    setManualOrder({
      ...manualOrder,
      items: manualOrder.items.filter(i => i.itemId !== itemId)
    });
  };

  const handlePlaceManualOrder = () => {
    if (!manualOrder.tableNumber || manualOrder.items.length === 0) {
      setError('Please enter a table number and add at least one item.');
      return;
    }
    axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
      tableNumber: parseInt(manualOrder.tableNumber),
      items: manualOrder.items.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
    })
      .then(() => {
        fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
        setManualOrder({ tableNumber: '', items: [], searchQuery: '' });
        setError(null);
      })
      .catch(err => {
        console.error('Error placing manual order:', err);
        setError('Failed to place manual order.');
      });
  };

  const filteredOrders = orders.filter(order => 
    activeTab === 'Past Orders' || activeTab === 'Today' ? true : order.status === activeTab
  );

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(manualOrder.searchQuery.toLowerCase())
  );

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

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
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 flex items-center justify-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Operator Dashboard - GSaheb Cafe
      </h1>
      
      {error && (
        <p className="text-center text-red-600 mb-4">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6">
        {[
          { name: 'Today', icon: <FaClock /> },
          { name: 'Pending', icon: <FaClock /> },
          { name: 'Prepared', icon: <FaCheck /> },
          { name: 'Completed', icon: <FaCheck /> },
          { name: 'Past Orders', icon: <FaList /> },
          { name: 'Menu Management', icon: <FaHamburger /> },
          { name: 'Manual Order', icon: <FaPlus /> },
          { name: 'Analytics', icon: <FaChartBar /> },
        ].map(tab => (
          <button
            key={tab.name}
            className="flex items-center px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.name ? '#b45309' : '#fed7aa',
              color: activeTab === tab.name ? '#ffffff' : '#1f2937',
              boxShadow: activeTab === tab.name ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon}
            <span className="ml-2">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Manual Order Tab */}
      {activeTab === 'Manual Order' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaPlus className="mr-2" style={{ color: '#b45309' }} /> Place Manual Order
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium">Table Number</label>
              <input
                type="number"
                value={manualOrder.tableNumber}
                onChange={e => setManualOrder({ ...manualOrder, tableNumber: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium">Search Menu Items</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={manualOrder.searchQuery}
                  onChange={e => setManualOrder({ ...manualOrder, searchQuery: e.target.value })}
                  placeholder="Search items..."
                  className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredMenuItems.length === 0 ? (
                <p className="text-gray-600">No items found.</p>
              ) : (
                filteredMenuItems.map(item => (
                  <div
                    key={item._id}
                    className="flex justify-between items-center p-2 border-b"
                  >
                    <div>
                      <p className="text-gray-800 font-medium">{item.name}</p>
                      <p className="text-gray-600 text-sm">
                        {item.category} | <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      className="px-3 py-1 rounded-lg text-white text-sm"
                      style={{ backgroundColor: '#16a34a' }}
                      onClick={() => handleAddToManualOrder(item)}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Selected Items</h3>
              {manualOrder.items.length === 0 ? (
                <p className="text-gray-600">No items selected.</p>
              ) : (
                <div className="space-y-2">
                  {manualOrder.items.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center border-b py-2">
                      <div>
                        <p className="text-gray-800">{item.name}</p>
                        <p className="text-gray-600 text-sm">
                          {item.quantity} x <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className="px-2 py-1 bg-gray-200 rounded"
                          onClick={() => setManualOrder({
                            ...manualOrder,
                            items: manualOrder.items.map(i =>
                              i.itemId === item.itemId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
                            )
                          })}
                        >
                          -
                        </button>
                        <button
                          className="px-2 py-1 bg-gray-200 rounded"
                          onClick={() => setManualOrder({
                            ...manualOrder,
                            items: manualOrder.items.map(i =>
                              i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
                            )
                          })}
                        >
                          +
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 text-sm"
                          onClick={() => handleRemoveFromManualOrder(item.itemId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
              onClick={handlePlaceManualOrder}
            >
              <FaCheck className="mr-2" /> Place Order
            </button>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'Analytics' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaChartBar className="mr-2" style={{ color: '#b45309' }} /> Analytics
          </h2>
          
          {/* Revenue */}
          <div className="mb-8 border-b-2 border-amber-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FaRupeeSign className="mr-2" /> Revenue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Today', value: analytics.revenue.today, color: '#fef3c7' },
                { label: 'This Week', value: analytics.revenue.week, color: '#ffedd5' },
                { label: 'This Month', value: analytics.revenue.month, color: '#fee2e2' },
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg shadow-sm transition-colors flex items-center"
                  style={{ backgroundColor: metric.color }}
                >
                  <FaArrowUp className="mr-3 text-green-600 text-xl" />
                  <div>
                    <p className="text-gray-600 text-sm">{metric.label}</p>
                    <p className="text-xl sm:text-2xl font-bold flex items-center">
                      <FaRupeeSign className="mr-1" />{metric.value.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Count */}
          <div className="mb-8 border-b-2 border-amber-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FaList className="mr-2" /> Today’s Orders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: analytics.orderCount.total, icon: <FaList className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' },
                { label: 'Pending', value: analytics.orderCount.pending, icon: <FaClock className="mr-3 text-red-600 text-xl" />, color: '#ffedd5' },
                { label: 'Prepared', value: analytics.orderCount.prepared, icon: <FaCheck className="mr-3 text-green-600 text-xl" />, color: '#fee2e2' },
                { label: 'Completed', value: analytics.orderCount.completed, icon: <FaCheck className="mr-3 text-blue-600 text-xl" />, color: '#fef3c7' },
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg shadow-sm transition-colors flex items-center"
                  style={{ backgroundColor: metric.color }}
                >
                  {metric.icon}
                  <div>
                    <p className="text-gray-600 text-sm">{metric.label}</p>
                    <p className="text-xl sm:text-2xl font-bold">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Items */}
          <div className="mb-8 border-b-2 border-amber-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FaHamburger className="mr-2" /> Top 5 Items (This Month)
            </h3>
            {analytics.topItems.length === 0 ? (
              <p className="text-gray-600">No data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.topItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg shadow-sm transition-colors flex items-center"
                    style={{ backgroundColor: '#fef3c7' }}
                  >
                    <FaArrowUp className="mr-3 text-green-600 text-xl" />
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
          <div className="mb-8 border-b-2 border-amber-200 pb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FaHamburger className="mr-2" /> Slow-Moving Items (This Week)
            </h3>
            {analytics.slowItems.length === 0 ? (
              <p className="text-gray-600">No data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.slowItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg shadow-sm transition-colors flex items-center"
                    style={{ backgroundColor: '#ffedd5' }}
                  >
                    <FaArrowDown className="mr-3 text-red-600 text-xl" />
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
            <div className="p-4 rounded-lg shadow-sm" style={{ backgroundColor: '#fef3c7' }}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
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
            <div className="p-4 rounded-lg shadow-sm" style={{ backgroundColor: '#ffedd5' }}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
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

      {/* Menu Management */}
      {activeTab === 'Menu Management' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaHamburger className="mr-2" style={{ color: '#b45309' }} /> Manage Menu
          </h2>
          
          {/* Add New Item Form */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <FaPlus className="mr-2" /> Add New Item
            </h3>
            <form onSubmit={handleAddMenuItem} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">Category</label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select Category</option>
                  {['Main Course', 'Drinks', 'Street Food', 'Salads', 'Desserts'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">Image (JPEG/PNG, max 5MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.isAvailable}
                    onChange={e => setNewItem({ ...newItem, isAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-700 text-sm">Available</span>
                </label>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#b45309' }}
              >
                <FaPlus className="mr-2" /> Add Item
              </button>
            </form>
          </div>

          {/* Menu Items List */}
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <FaList className="mr-2" /> Menu Items
          </h3>
          <div className="space-y-4">
            {menuItems.length === 0 ? (
              <p className="text-gray-600">No menu items available.</p>
            ) : (
              menuItems.map(item => (
                <div
                  key={item._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <div className="flex items-center mb-2 sm:mb-0">
                    {item.image ? (
                      <img
                        src={`${process.env.REACT_APP_API_URL}${item.image}`}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4 flex items-center justify-center">
                        <FaUtensils className="text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-800">{item.name}</h4>
                      <p className="text-gray-600 text-sm">
                        {item.category} | <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}
                      </p>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                      <p className={item.isAvailable ? 'text-green-600' : 'text-red-600'}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: item.isAvailable ? '#dc2626' : '#16a34a' }}
                      onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                    >
                      {item.isAvailable ? (
                        <>
                          <FaTimes className="mr-2" /> Mark Unavailable
                        </>
                      ) : (
                        <>
                          <FaCheck className="mr-2" /> Mark Available
                        </>
                      )}
                    </button>
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#4b5563' }}
                      onClick={() => handleDeleteMenuItem(item._id)}
                    >
                      <FaTrash className="mr-2" /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Orders */}
      {['Today', 'Pending', 'Prepared', 'Completed', 'Past Orders'].includes(activeTab) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredOrders.length === 0 ? (
            <p className="text-center col-span-full text-gray-600">
              No {activeTab.toLowerCase()} orders.
            </p>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order._id}
                className={`bg-white rounded-lg shadow-md p-4 ${
                  newOrderIds.has(order._id) ? 'border-2 border-amber-500 animate-pulse' : ''
                }`}
              >
                <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                  <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Table {order.tableNumber} (Order #{order.orderNumber})
                </h2>
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
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#2563eb' }}
                    onClick={() => handleEditOrder(order)}
                  >
                    <FaEdit className="mr-2" /> View/Edit
                  </button>
                  {order.status === 'Pending' && (
                    <>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleStatusUpdate(order._id, 'Prepared')}
                      >
                        <FaCheck className="mr-2" /> Mark as Prepared
                      </button>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={() => handleCancelOrder(order._id)}
                      >
                        <FaTimes className="mr-2" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center">
              <FaEdit className="mr-2" style={{ color: '#b45309' }} /> Edit Order - Table {editingOrder.tableNumber} (Order #{editingOrder.orderNumber})
            </h2>
            <div className="space-y-4">
              {editingOrder.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 flex-wrap gap-2">
                  <select
                    className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500"
                    value={item.itemId}
                    onChange={e => {
                      const newItem = menuItems.find(m => m._id === e.target.value);
                      const newItems = [...editingOrder.items];
                      newItems[index] = {
                        ...newItems[index],
                        itemId: newItem._id,
                        name: newItem.name,
                        price: newItem.price
                      };
                      setEditingOrder({ ...editingOrder, items: newItems });
                    }}
                  >
                    {menuItems.map(menuItem => (
                      <option key={menuItem._id} value={menuItem._id}>
                        {menuItem.name} (<FaRupeeSign className="inline mr-1" />{menuItem.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="border rounded-lg px-2 py-1 w-16 text-sm focus:ring-2 focus:ring-amber-500"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...editingOrder.items];
                      newItems[index].quantity = parseInt(e.target.value) || 1;
                      setEditingOrder({ ...editingOrder, items: newItems });
                    }}
                  />
                  <button
                    className="text-red-600 hover:text-red-800 text-sm focus:outline-none"
                    onClick={() => {
                      const newItems = editingOrder.items.filter((_, i) => i !== index);
                      setEditingOrder({ ...editingOrder, items: newItems });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                onClick={() => {
                  const newItems = [
                    ...editingOrder.items,
                    { itemId: menuItems[0]._id, quantity: 1, name: menuItems[0].name, price: menuItems[0].price }
                  ];
                  setEditingOrder({ ...editingOrder, items: newItems });
                }}
              >
                <FaPlus className="mr-2" /> Add Item
              </button>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#4b5563' }}
                onClick={() => setEditingOrder(null)}
              >
                <FaTimes className="mr-2" /> Cancel
              </button>
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#b45309' }}
                onClick={handleSaveEdit}
              >
                <FaCheck className="mr-2" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorDashboard;