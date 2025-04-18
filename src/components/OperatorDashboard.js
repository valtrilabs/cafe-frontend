import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FaUtensils, FaBell, FaShoppingCart, FaChartBar, FaClock, FaTimes, FaPlus, FaSearch, FaRupeeSign, FaCheck, FaEdit, FaTrash, FaPrint } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [staffCalls, setStaffCalls] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Recent');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [manualOrder, setManualOrder] = useState({ tableNumber: '', items: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: null });

  useEffect(() => {
    const storedAuth = localStorage.getItem('operatorAuth');
    if (storedAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('operatorAuth', 'true');
      setError(null);
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('operatorAuth');
    setPassword('');
  };

  const fetchOrders = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders?date=past48`)
      .then(res => {
        const sortedOrders = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sortedOrders);
        setError(null);
        try {
          const audio = new Audio('/sounds/new-order.wav');
          audio.play().catch(err => console.error('Audio play failed:', err));
        } catch (err) {
          console.error('Audio error:', err);
        }
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      });
  };

  const fetchStaffCalls = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/staff-calls?date=past48`)
      .then(res => {
        setStaffCalls(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching staff calls:', err);
        setError('Failed to load staff calls. Please try again.');
      });
  };

  const fetchMenuItems = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        setMenuItems(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching menu items:', err);
        setError('Failed to load menu items. Please try again.');
      });
  };

  const fetchAnalytics = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders/analytics`)
      .then(res => {
        setAnalytics(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics. Please try again.');
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchStaffCalls();
      fetchMenuItems();
      fetchAnalytics();
      const interval = setInterval(() => {
        fetchOrders();
        fetchStaffCalls();
        fetchAnalytics();
        setCurrentTime(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleStatusChange = (orderId, status) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, { status })
      .then(() => {
        fetchOrders();
        setError(null);
      })
      .catch(err => {
        console.error('Error updating order status:', err);
        setError('Failed to update order status.');
      });
  };

  const handleStaffCallResolve = (callId) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/staff-calls/${callId}`, { status: 'Resolved' })
      .then(() => {
        fetchStaffCalls();
        setError(null);
      })
      .catch(err => {
        console.error('Error resolving staff call:', err);
        setError('Failed to resolve staff call.');
      });
  };

  const handleManualOrderSubmit = (e) => {
    e.preventDefault();
    if (!manualOrder.tableNumber || manualOrder.items.length === 0) {
      setError('Please provide a table number and at least one item.');
      return;
    }
    axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
      tableNumber: parseInt(manualOrder.tableNumber),
      items: manualOrder.items.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
    })
      .then(() => {
        setManualOrder({ tableNumber: '', items: [] });
        fetchOrders();
        setError(null);
      })
      .catch(err => {
        console.error('Error creating manual order:', err);
        setError('Failed to create manual order.');
      });
  };

  const addItemToManualOrder = (item) => {
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
        items: [...manualOrder.items, { itemId: item._id, name: item.name, price: item.price, quantity: 1 }]
      });
    }
  };

  const removeItemFromManualOrder = (itemId) => {
    setManualOrder({
      ...manualOrder,
      items: manualOrder.items.filter(i => i.itemId !== itemId)
    });
  };

  const updateManualOrderQuantity = (itemId, quantity) => {
    setManualOrder({
      ...manualOrder,
      items: manualOrder.items.map(i =>
        i.itemId === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    });
  };

  const handleAddMenuItem = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newItem.name);
    formData.append('price', newItem.price);
    formData.append('category', newItem.category);
    formData.append('description', newItem.description);
    if (newItem.image) {
      formData.append('image', newItem.image);
    }
    axios.post(`${process.env.REACT_APP_API_URL}/api/menu`, formData)
      .then(() => {
        setNewItem({ name: '', price: '', category: '', description: '', image: null });
        fetchMenuItems();
        setError(null);
      })
      .catch(err => {
        console.error('Error adding menu item:', err);
        setError('Failed to add menu item.');
      });
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setEditingItems(order.items.map(item => ({
      itemId: item.itemId?._id,
      name: item.itemId?.name || '[Deleted Item]',
      quantity: item.quantity
    })));
  };

  const handleSaveEdit = () => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${editingOrder._id}`, {
      items: editingItems.filter(item => item.itemId).map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      }))
    })
      .then(() => {
        setEditingOrder(null);
        setEditingItems([]);
        fetchOrders();
        setError(null);
      })
      .catch(err => {
        console.error('Error saving order edit:', err);
        setError('Failed to save order edit.');
      });
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentOrders = orders
    .filter(order => new Date(order.createdAt).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const pastOrders = orders.filter(order => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const orderDate = new Date(order.createdAt);
    return orderDate >= tenDaysAgo && orderDate < new Date().setHours(0, 0, 0, 0);
  });

  const paidOrders = orders.filter(order => order.status === 'Completed');
  const unpaidOrders = orders.filter(order => order.status === 'Pending' || order.status === 'Prepared');

  const tabs = [
    { name: 'Recent', data: recentOrders },
    { name: 'Past Orders', data: pastOrders },
    { name: 'Staff Calls', data: staffCalls },
    { name: 'Create Manual Order', data: null },
    { name: 'Add Menu Item', data: null },
    { name: 'Analytics', data: analytics },
    { name: 'Paid Bills', data: paidOrders },
    { name: 'Unpaid Bills', data: unpaidOrders }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Operator Dashboard Login</h1>
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
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
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
          <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Operator Dashboard - GSaheb Cafe
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

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FaClock className="text-gray-600" />
          <span className="text-gray-600">{currentTime.toLocaleString()}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.name}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: activeTab === tab.name ? '#b45309' : '#fed7aa',
                color: activeTab === tab.name ? '#ffffff' : '#1f2937'
              }}
              onClick={() => setActiveTab(tab.name)}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Recent' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Recent Orders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-600 col-span-full">No recent orders found.</p>
            ) : (
              recentOrders.map(order => (
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
                    {order.status === 'Pending' && (
                      <button
                        className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleStatusChange(order._id, 'Prepared')}
                      >
                        <FaCheck className="mr-2" /> Mark as Prepared
                      </button>
                    )}
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#2563eb' }}
                      onClick={() => handleEditOrder(order)}
                    >
                      <FaEdit className="mr-2" /> View/Edit
                    </button>
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#dc2626' }}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this order?')) {
                          axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${order._id}`)
                            .then(() => fetchOrders())
                            .catch(err => setError('Failed to cancel order.'));
                        }
                      }}
                    >
                      <FaTrash className="mr-2" /> Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'Past Orders' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Past Orders (Last 10 Days)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastOrders.length === 0 ? (
              <p className="text-center text-gray-600 col-span-full">No past orders found.</p>
            ) : (
              pastOrders.map(order => (
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
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'Staff Calls' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaBell className="mr-2" style={{ color: '#b45309' }} /> Staff Calls
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffCalls.length === 0 ? (
              <p className="text-center text-gray-600 col-span-full">No staff calls found.</p>
            ) : (
              staffCalls.map(call => (
                <div
                  key={call._id}
                  className="bg-white rounded-lg shadow-md p-4"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <h3 className="text-lg font-semibold flex items-center">
                    <FaBell className="mr-2" style={{ color: '#b45309' }} /> Table {call.tableNumber}
                  </h3>
                  <p className="text-gray-600 text-sm flex items-center">
                    <FaClock className="mr-2" /> Requested: {new Date(call.timestamp).toLocaleString()}
                  </p>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      call.status === 'Pending' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    Status: {call.status}
                  </p>
                  {call.status === 'Pending' && (
                    <button
                      className="mt-4 w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#16a34a' }}
                      onClick={() => handleStaffCallResolve(call._id)}
                    >
                      <FaCheck className="mr-2" /> Mark as Resolved
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'Create Manual Order' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaShoppingCart className="mr-2" style={{ color: '#b45309' }} /> Create Manual Order
          </h2>
          <form onSubmit={handleManualOrderSubmit} className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Table Number</label>
              <input
                type="number"
                value={manualOrder.tableNumber}
                onChange={e => setManualOrder({ ...manualOrder, tableNumber: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Search Menu Items</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full border rounded-lg px-10 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Menu Items</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredMenuItems.length === 0 ? (
                  <p className="text-gray-600 text-sm">No items found.</p>
                ) : (
                  filteredMenuItems.map(item => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-2 bg-gray-100 rounded-lg"
                    >
                      <span className="text-sm">{item.name} (<FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)})</span>
                      <button
                        className="px-2 py-1 rounded-lg text-white text-sm"
                        style={{ backgroundColor: '#b45309' }}
                        onClick={() => addItemToManualOrder(item)}
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Selected Items</h3>
              {manualOrder.items.length === 0 ? (
                <p className="text-gray-600 text-sm">No items selected.</p>
              ) : (
                <div className="space-y-2">
                  {manualOrder.items.map(item => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between p-2 bg-gray-100 rounded-lg"
                    >
                      <span className="text-sm">{item.name} (<FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)})</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateManualOrderQuantity(item.itemId, parseInt(e.target.value) || 1)}
                          className="w-16 border rounded-lg px-2 py-1"
                          min="1"
                        />
                        <button
                          className="px-2 py-1 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#dc2626' }}
                          onClick={() => removeItemFromManualOrder(item.itemId)}
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
              type="submit"
              className="w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
            >
              <FaPlus className="mr-2" /> Create Order
            </button>
          </form>
        </div>
      )}

      {activeTab === 'Add Menu Item' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Add New Menu Item
          </h2>
          <form onSubmit={handleAddMenuItem} className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Price</label>
              <input
                type="number"
                value={newItem.price}
                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Description</label>
              <textarea
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                rows="4"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Image</label>
              <input
                type="file"
                onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
            >
              <FaPlus className="mr-2" /> Add Item
            </button>
          </form>
        </div>
      )}

      {activeTab === 'Analytics' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaChartBar className="mr-2" style={{ color: '#b45309' }} /> Analytics
          </h2>
          {analytics ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
                <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Today</p>
                    <p className="text-xl font-bold flex items-center">
                      <FaRupeeSign className="mr-1" />{analytics.revenue.today.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">This Week</p>
                    <p className="text-xl font-bold flex items-center">
                      <FaRupeeSign className="mr-1" />{analytics.revenue.week.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">This Month</p>
                    <p className="text-xl font-bold flex items-center">
                      <FaRupeeSign className="mr-1" />{analytics.revenue.month.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
                <h3 className="text-lg font-semibold mb-2">Order Counts (Today)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Total</p>
                    <p className="text-xl font-bold">{analytics.orderCount.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Pending</p>
                    <p className="text-xl font-bold">{analytics.orderCount.pending}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Prepared</p>
                    <p className="text-xl font-bold">{analytics.orderCount.prepared}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Completed</p>
                    <p className="text-xl font-bold">{analytics.orderCount.completed}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
                <h3 className="text-lg font-semibold mb-2">Top 5 Items (This Month)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topItems}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Quantity']} />
                    <Legend />
                    <Bar dataKey="quantity" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4" style={{ backgroundColor: '#fef3c7' }}>
                <h3 className="text-lg font-semibold mb-2">Category Performance (This Month)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categories}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#f59e0b"
                      label
                    >
                      {analytics.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#f59e0b', '#facc15', '#fef3c7', '#b45309', '#92400e'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [<FaRupeeSign className="inline mr-1" />, value.toFixed(2)]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-600">Loading analytics...</p>
          )}
        </div>
      )}

      {activeTab === 'Paid Bills' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Paid Bills
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidOrders.length === 0 ? (
              <p className="text-center text-gray-600 col-span-full">No paid bills found.</p>
            ) : (
              paidOrders.map(order => (
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
                  <p className="mt-2 text-sm font-medium text-blue-600">
                    Status: {order.status}
                  </p>
                  <p className="mt-2 text-sm font-bold flex items-center">
                    Total: <FaRupeeSign className="ml-1 mr-1" />
                    {order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'Unpaid Bills' && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Unpaid Bills
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpaidOrders.length === 0 ? (
              <p className="text-center text-gray-600 col-span-full">No unpaid bills found.</p>
            ) : (
              unpaidOrders.map(order => (
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
                    {order.status === 'Pending' && (
                      <button
                        className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleStatusChange(order._id, 'Prepared')}
                      >
                        <FaCheck className="mr-2" /> Mark as Prepared
                      </button>
                    )}
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#2563eb' }}
                      onClick={() => handleEditOrder(order)}
                    >
                      <FaEdit className="mr-2" /> View/Edit
                    </button>
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#dc2626' }}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this order?')) {
                          axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${order._id}`)
                            .then(() => fetchOrders())
                            .catch(err => setError('Failed to cancel order.'));
                        }
                      }}
                    >
                      <FaTrash className="mr-2" /> Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaEdit className="mr-2" style={{ color: '#b45309' }} /> Edit Order #{editingOrder.orderNumber}
            </h2>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Items</h3>
              {editingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg mb-2">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...editingItems];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setEditingItems(newItems);
                      }}
                      className="w-16 border rounded-lg px-2 py-1"
                      min="1"
                    />
                    <button
                      className="px-2 py-1 rounded-lg text-white text-sm"
                      style={{ backgroundColor: '#dc2626' }}
                      onClick={() => {
                        setEditingItems(editingItems.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Add New Item</h4>
                <select
                  onChange={e => {
                    const selectedItem = menuItems.find(item => item._id === e.target.value);
                    if (selectedItem) {
                      setEditingItems([...editingItems, {
                        itemId: selectedItem._id,
                        name: selectedItem.name,
                        quantity: 1
                      }]);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Item</option>
                  {menuItems.map(item => (
                    <option key={item._id} value={item._id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#dc2626' }}
                onClick={() => {
                  setEditingOrder(null);
                  setEditingItems([]);
                }}
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