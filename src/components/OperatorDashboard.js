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
  const [manualOrder, setManualOrder] = useState({
    tableNumber: '',
    items: [],
    searchQuery: ''
  });
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [newEditItem, setNewEditItem] = useState({ itemId: '', quantity: 1 });

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
        setFilteredMenuItems(res.data);
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
    fetchOrders('Today');
    fetchMenuItems();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchOrders(activeTab === 'Today' ? 'Today' : activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
      if (activeTab === 'Analytics') fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

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
      items: validItems,
      orderNumber: order.orderNumber
    });
  };

  const handleAddItemToEdit = () => {
    if (!newEditItem.itemId || newEditItem.quantity < 1) {
      setError('Please select a menu item and specify a valid quantity.');
      return;
    }
    const selectedItem = menuItems.find(item => item._id === newEditItem.itemId);
    if (!selectedItem) {
      setError('Selected menu item not found.');
      return;
    }
    const newItem = {
      itemId: selectedItem._id,
      name: selectedItem.name,
      price: selectedItem.price,
      quantity: parseInt(newEditItem.quantity)
    };
    setEditingOrder({
      ...editingOrder,
      items: [...editingOrder.items, newItem]
    });
    setNewEditItem({ itemId: '', quantity: 1 });
    setError(null);
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
        setError(null);
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

  const handleToggleAvailability = (itemId, currentAvailability) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/menu/${itemId}`, { isAvailable: !currentAvailability })
      .then((response) => {
        console.log('Availability toggled:', response.data);
        fetchMenuItems();
        setError(null);
      })
      .catch(err => {
        console.error('Error toggling availability:', err);
        setError('Failed to toggle availability. Please try again.');
      });
  };

  const handleSearchItems = (query) => {
    setManualOrder({ ...manualOrder, searchQuery: query });
    if (query.trim() === '') {
      setFilteredMenuItems(menuItems);
    } else {
      setFilteredMenuItems(
        menuItems.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const addToManualCart = (item) => {
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

  const updateManualQuantity = (itemId, delta) => {
    setManualOrder({
      ...manualOrder,
      items: manualOrder.items.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    });
  };

  const removeFromManualCart = (itemId) => {
    setManualOrder({
      ...manualOrder,
      items: manualOrder.items.filter(item => item.itemId !== itemId)
    });
  };

  const placeManualOrder = () => {
    if (!manualOrder.tableNumber || manualOrder.items.length === 0) {
      setError('Please select a table number and add items to the order.');
      return;
    }
    const payload = {
      tableNumber: parseInt(manualOrder.tableNumber),
      items: manualOrder.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      })),
      isManual: true
    };
    console.log('Placing manual order:', payload);
    axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, payload)
      .then((response) => {
        console.log('Manual order placed:', response.data);
        setManualOrder({ tableNumber: '', items: [], searchQuery: '' });
        setFilteredMenuItems(menuItems);
        fetchOrders('Today');
        setError(null);
        alert('Manual order placed successfully.');
      })
      .catch(err => {
        console.error('Error placing manual order:', err.response?.data || err.message);
        setError(`Failed to place manual order: ${err.response?.data?.error || err.message}`);
      });
  };

  const filteredOrders = orders.filter(order => 
    activeTab === 'Past Orders' || activeTab === 'Today' ? true : order.status === activeTab
  );

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

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
          { name: 'Analytics', icon: <FaChartBar /> },
          { name: 'Create Manual Order', icon: <FaPlus /> }
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

      {/* Create Manual Order Tab */}
      {activeTab === 'Create Manual Order' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaPlus className="mr-2" style={{ color: '#b45309' }} /> Create Manual Order
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium">Table Number</label>
              <input
                type="number"
                value={manualOrder.tableNumber}
                onChange={e => setManualOrder({ ...manualOrder, tableNumber: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                placeholder="Enter table number"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium">Search Items</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={manualOrder.searchQuery}
                  onChange={e => handleSearchItems(e.target.value)}
                  className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-amber-500"
                  placeholder="Search menu items..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenuItems.map(item => (
                <div
                  key={item._id}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.category} | <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}</p>
                  </div>
                  <button
                    className="px-3 py-1 rounded-lg text-white text-sm"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => addToManualCart(item)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Order Summary</h3>
              {manualOrder.items.length === 0 ? (
                <p className="text-gray-600">No items added.</p>
              ) : (
                <div className="space-y-2">
                  {manualOrder.items.map(item => (
                    <div key={item.itemId} className="flex items-center justify-between border-b py-2">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex items-center space-x-2">
                          <button
                            className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                            onClick={() => updateManualQuantity(item.itemId, -1)}
                          >
                            -
                          </button>
                          <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                          <button
                            className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                            onClick={() => updateManualQuantity(item.itemId, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm"><FaRupeeSign className="inline mr-1" />{(item.price * item.quantity).toFixed(2)}</p>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm"
                          onClick={() => removeFromManualCart(item.itemId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="font-bold flex items-center">
                    Total: <FaRupeeSign className="ml-1 mr-1" />
                    {manualOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <button
              className="w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
              onClick={placeManualOrder}
              disabled={manualOrder.items.length === 0 || !manualOrder.tableNumber}
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
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <div className="flex items-center">
                    {item.image && (
                      <img
                        src={`${process.env.REACT_APP_API_URL}${item.image}`}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded mr-3"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.category} | <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className={`px-3 py-1 rounded-lg text-white text-sm ${
                        item.isAvailable ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                    >
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm"
                      onClick={() => handleDeleteMenuItem(item._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Orders Tabs (Today, Pending, Prepared, Completed, Past Orders) */}
      {(activeTab === 'Today' || activeTab === 'Pending' || activeTab === 'Prepared' || activeTab === 'Completed' || activeTab === 'Past Orders') && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaList className="mr-2" style={{ color: '#b45309' }} /> {activeTab} Orders
          </h2>
          {filteredOrders.length === 0 ? (
            <p className="text-gray-600">No orders found.</p>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div
                  key={order._id}
                  className={`p-4 rounded-lg shadow-sm transition-colors ${
                    newOrderIds.has(order._id) ? 'animate-pulse bg-green-100' : ''
                  }`}
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
                    <p className={`text-sm font-medium ${
                      order.status === 'Pending' ? 'text-red-600' :
                      order.status === 'Prepared' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
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
                  <div className="mt-3 flex space-x-2">
                    {order.status !== 'Completed' && (
                      <>
                        <button
                          className="px-3 py-1 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#16a34a' }}
                          onClick={() => handleStatusUpdate(order._id, order.status === 'Pending' ? 'Prepared' : 'Completed')}
                        >
                          <FaCheck className="inline mr-1" /> Mark as {order.status === 'Pending' ? 'Prepared' : 'Completed'}
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#f59e0b' }}
                          onClick={() => handleEditOrder(order)}
                        >
                          <FaEdit className="inline mr-1" /> Edit
                        </button>
                      </>
                    )}
                    {order.status === 'Pending' && (
                      <button
                        className="px-3 py-1 rounded-lg text-white text-sm"
                        style={{ backgroundColor: '#ef4444' }}
                        onClick={() => handleCancelOrder(order._id)}
                      >
                        <FaTimes className="inline mr-1" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center">
              <FaEdit className="mr-2" style={{ color: '#b45309' }} /> Edit Order #{editingOrder.orderNumber}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium">Order Number</label>
                <input
                  type="text"
                  value={editingOrder.orderNumber}
                  onChange={e => setEditingOrder({ ...editingOrder, orderNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">Table Number</label>
                <input
                  type="number"
                  value={editingOrder.tableNumber}
                  onChange={e => setEditingOrder({ ...editingOrder, tableNumber: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Items</h3>
                {editingOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600"><FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                        onClick={() => {
                          const newItems = [...editingOrder.items];
                          newItems[index].quantity = Math.max(1, newItems[index].quantity - 1);
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                      >
                        -
                      </button>
                      <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        onClick={() => {
                          const newItems = [...editingOrder.items];
                          newItems[index].quantity += 1;
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                      >
                        +
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          const newItems = editingOrder.items.filter((_, i) => i !== index);
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Add New Item</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newEditItem.itemId}
                    onChange={e => setNewEditItem({ ...newEditItem, itemId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select Menu Item</option>
                    {menuItems.map(item => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.category}, ₹{item.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={newEditItem.quantity}
                    onChange={e => setNewEditItem({ ...newEditItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full sm:w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    placeholder="Qty"
                  />
                  <button
                    className="px-3 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={handleAddItemToEdit}
                  >
                    <FaPlus className="inline mr-1" /> Add
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#16a34a' }}
                  onClick={handleSaveEdit}
                >
                  <FaCheck className="inline mr-1" /> Save
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#ef4444' }}
                  onClick={() => setEditingOrder(null)}
                >
                  <FaTimes className="inline mr-1" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorDashboard;