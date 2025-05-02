import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUtensils, FaList, FaClock, FaHamburger, FaPrint, FaRupeeSign } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending');
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

  const fetchOrders = async (tab) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const url = tab === 'Past Orders'
        ? `https://cafe-backend-ay2n.onrender.com/api/orders?dateTo=${todayStart.toISOString()}`
        : `https://cafe-backend-ay2n.onrender.com/api/orders?status=${tab.toLowerCase()}`;
      const res = await axios.get(url);
      console.log('Orders fetched:', res.data);
      const newOrders = res.data.filter(order => order.tableNumber != null);
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
            await audio.play();
          } catch (err) {
            console.error('Audio play failed:', err);
          }
          setTimeout(() => setNewOrderIds(new Set()), 5000);
        }
      }
      setOrders(sortedOrders);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/menu/operator');
      console.log('Menu items fetched for operator:', res.data);
      setMenuItems(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu for operator:', err);
      setError('Failed to load menu items.');
    }
  };

  useEffect(() => {
    fetchOrders('Pending');
    fetchMenuItems();
    const interval = setInterval(() => {
      fetchOrders(activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`, { status });
      await fetchOrders(activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
      setError(null);
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order.');
    }
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

  const handleSaveEdit = async () => {
    try {
      await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${editingOrder._id}`, {
        tableNumber: editingOrder.tableNumber,
        items: editingOrder.items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        })),
        status: editingOrder.status
      });
      await fetchOrders(activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
      setEditingOrder(null);
      setError(null);
    } catch (err) {
      console.error('Error saving order:', err);
      setError('Failed to save order.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await axios.delete(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`);
        await fetchOrders(activeTab === 'Past Orders' ? 'Past Orders' : activeTab);
        setError(null);
      } catch (err) {
        console.error('Error canceling order:', err);
        setError('Failed to cancel order.');
      }
    }
  };

  const handlePrintBill = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
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
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newItem.name);
      formData.append('category', newItem.category);
      formData.append('price', newItem.price);
      formData.append('description', newItem.description);
      formData.append('isAvailable', newItem.isAvailable);
      if (newItem.image) {
        formData.append('image', newItem.image);
      }
      await axios.post('https://cafe-backend-ay2n.onrender.com/api/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMenuItems();
      setNewItem({
        name: '',
        category: '',
        price: '',
        description: '',
        isAvailable: true,
        image: null,
      });
      setError(null);
    } catch (err) {
      console.error('Error adding menu item:', err);
      setError('Failed to add menu item. Ensure image is JPEG/PNG and under 5MB.');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await axios.delete(`https://cafe-backend-ay2n.onrender.com/api/menu/${itemId}`);
        await fetchMenuItems();
        setError(null);
      } catch (err) {
        console.error('Error deleting menu item:', err);
        setError('Failed to delete menu item.');
      }
    }
  };

  const handleToggleAvailability = async (itemId, isAvailable) => {
    try {
      await axios.put(`https://cafe-backend-ay2n.onrender.com/api/menu/${itemId}`, { isAvailable: !isAvailable });
      await fetchMenuItems();
      setError(null);
    } catch (err) {
      console.error('Error updating availability:', err);
      setError('Failed to update availability.');
    }
  };

  const filteredOrders = activeTab === 'Past Orders' ? orders : orders.filter(order => order.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 flex items-center justify-center text-gray-800">
        <FaUtensils className="mr-2 text-amber-600" /> Operator Dashboard - GSaheb Cafe
      </h1>
      
      {error && (
        <p className="text-center text-red-600 mb-4 bg-red-100 p-3 rounded-lg">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 bg-white rounded-lg shadow-md p-4">
        {[
          { name: 'Pending', icon: <FaClock /> },
          { name: 'Prepared', icon: <FaCheck /> },
          { name: 'Completed', icon: <FaCheck /> },
          { name: 'Past Orders', icon: <FaList /> },
          { name: 'Menu Management', icon: <FaHamburger /> }
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

      {/* Menu Management */}
      {activeTab === 'Menu Management' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center text-gray-800">
            <FaHamburger className="mr-2 text-amber-600" /> Manage Menu
          </h2>
          
          {/* Add New Item Form */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3 flex items-center text-gray-700">
              <FaPlus className="mr-2" /> Add New Item
            </h3>
            <form onSubmit={handleAddMenuItem} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="item-name">Name</label>
                <input
                  id="item-name"
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                  aria-describedby="item-name-error"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="item-category">Category</label>
                <select
                  id="item-category"
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                  aria-describedby="item-category-error"
                >
                  <option value="">Select Category</option>
                  {['Main Course', 'Drinks', 'Street Food', 'Salads', 'Desserts'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="item-price">Price (₹)</label>
                <input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                  aria-describedby="item-price-error"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="item-description">Description</label>
                <textarea
                  id="item-description"
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  rows="4"
                  aria-describedby="item-description-error"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="item-image">Image (JPEG/PNG, max 5MB)</label>
                <input
                  id="item-image"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })}
                  className="w-full border rounded-lg px-3 py-2"
                  aria-describedby="item-image-error"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.isAvailable}
                    onChange={e => setNewItem({ ...newItem, isAvailable: e.target.checked })}
                    className="mr-2"
                    aria-label="Item availability"
                  />
                  <span className="text-gray-700 text-sm">Available</span>
                </label>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
                style={{ backgroundColor: '#b45309' }}
                aria-label="Add new menu item"
              >
                <FaPlus className="mr-2" /> Add Item
              </button>
            </form>
          </div>

          {/* Menu Items List */}
          <h3 className="text-lg font-medium mb-3 flex items-center text-gray-700">
            <FaList className="mr-2" /> Menu Items
          </h3>
          <div className="space-y-4">
            {menuItems.length === 0 ? (
              <p className="text-gray-600">No menu items available.</p>
            ) : (
              menuItems.map(item => (
                <div
                  key={item._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg hover:bg-amber-50 transition-colors"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <div className="flex items-center mb-2 sm:mb-0">
                    {item.image ? (
                      <img
                        src={`https://cafe-backend-ay2n.onrender.com${item.image}`}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                        onError={e => (e.target.src = 'https://source.unsplash.com/64x64/?food')}
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
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                      style={{ backgroundColor: item.isAvailable ? '#dc2626' : '#16a34a' }}
                      onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                      aria-label={item.isAvailable ? 'Mark item as unavailable' : 'Mark item as available'}
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
                      className="w-full sm:w-auto px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-gray-700 transition-colors"
                      style={{ backgroundColor: '#4b5563' }}
                      onClick={() => handleDeleteMenuItem(item._id)}
                      aria-label={`Delete ${item.name}`}
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
      {['Pending', 'Prepared', 'Completed', 'Past Orders'].includes(activeTab) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredOrders.length === 0 ? (
            <p className="text-center col-span-full text-gray-600">
              No {activeTab.toLowerCase()} orders.
            </p>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order._id}
                className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${
                  newOrderIds.has(order._id) ? 'border-2 border-amber-500 animate-pulse' : ''
                }`}
              >
                <h2 className="text-lg sm:text-xl font-semibold flex items-center text-gray-800">
                  <FaUtensils className="mr-2 text-amber-600" /> Table {order.tableNumber} (Order #{order.orderNumber})
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
                    className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-blue-700 transition-colors"
                    style={{ backgroundColor: '#2563eb' }}
                    onClick={() => handleEditOrder(order)}
                    aria-label={`Edit order ${order.orderNumber}`}
                  >
                    <FaEdit className="mr-2" /> View/Edit
                  </button>
                  {order.status === 'Pending' && (
                    <>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-green-700 transition-colors"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleStatusUpdate(order._id, 'Prepared')}
                        aria-label={`Mark order ${order.orderNumber} as prepared`}
                      >
                        <FaCheck className="mr-2" /> Mark as Prepared
                      </button>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={() => handleCancelOrder(order._id)}
                        aria-label={`Cancel order ${order.orderNumber}`}
                      >
                        <FaTimes className="mr-2" /> Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'Prepared' && (
                    <>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-blue-600 transition-colors"
                        style={{ backgroundColor: '#1e40af' }}
                        onClick={() => handlePrintBill(order)}
                        aria-label={`Print receipt for order ${order.orderNumber}`}
                      >
                        <FaPrint className="mr-2" /> Print Receipt
                      </button>
                      <button
                        className="w-full px-3 py-2 rounded-lg text-white flex items-center justify-center text-sm hover:bg-green-700 transition-colors"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={() => handleStatusUpdate(order._id, 'Completed')}
                        aria-label={`Mark order ${order.orderNumber} as completed`}
                      >
                        <FaCheck className="mr-2" /> Mark as Completed
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
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center text-gray-800">
              <FaEdit className="mr-2 text-amber-600" /> Edit Order - Table {editingOrder.tableNumber} (Order #{editingOrder.orderNumber})
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium" htmlFor="table-number">Table Number</label>
                <input
                  id="table-number"
                  type="number"
                  min="1"
                  value={editingOrder.tableNumber}
                  onChange={e => setEditingOrder({ ...editingOrder, tableNumber: parseInt(e.target.value) || 1 })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  aria-label="Table number"
                />
              </div>
              {(editingOrder.status === 'Pending' || editingOrder.status === 'Prepared') && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium" htmlFor="order-status">Status</label>
                  <select
                    id="order-status"
                    value={editingOrder.status}
                    onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    aria-label="Order status"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Prepared">Prepared</option>
                  </select>
                </div>
              )}
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
                    aria-label={`Select item ${index + 1}`}
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
                    aria-label={`Quantity for item ${index + 1}`}
                  />
                  <button
                    className="text-red-600 hover:text-red-800 text-sm focus:outline-none"
                    onClick={() => {
                      const newItems = editingOrder.items.filter((_, i) => i !== index);
                      setEditingOrder({ ...editingOrder, items: newItems });
                    }}
                    aria-label={`Remove item ${index + 1}`}
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
                aria-label="Add new item to order"
              >
                <FaPlus className="mr-2" /> Add Item
              </button>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
                style={{ backgroundColor: '#4b5563' }}
                onClick={() => setEditingOrder(null)}
                aria-label="Cancel order edit"
              >
                <FaTimes className="mr-2" /> Cancel
              </button>
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
                style={{ backgroundColor: '#b45309' }}
                onClick={handleSaveEdit}
                aria-label="Save order changes"
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