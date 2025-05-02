import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUtensils, FaList, FaClock, FaHamburger, FaPrint, FaRupeeSign, FaFileExport } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('New Orders');
  const [editingOrder, setEditingOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    isAvailable: true
  });
  const [revenueData, setRevenueData] = useState({
    today: 0,
    week: 0,
    month: 0,
    year: 0
  });

  const fetchOrders = async (tab) => {
    try {
      const statusMap = {
        'New Orders': 'pending',
        'Ready Orders': 'prepared',
        'Paid Bills': 'completed'
      };
      const url = `https://cafe-backend-ay2n.onrender.com/api/orders?status=${statusMap[tab]}`;
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
      setError('Cannot load orders. Please try again.');
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/menu/operator');
      console.log('Menu items fetched:', res.data);
      setMenuItems(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError('Cannot load menu items.');
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/orders/analytics');
      console.log('Analytics fetched:', res.data);
      const { revenue } = res.data;
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearRevenue = orders
        .filter(o => new Date(o.createdAt) >= yearStart && o.status === 'Completed')
        .reduce((sum, order) => sum + order.items.reduce((s, item) => s + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0), 0);
      setRevenueData({
        today: revenue.today || 0,
        week: revenue.week || 0,
        month: revenue.month || 0,
        year: yearRevenue
      });
    } catch (err) {
      console.error('Error fetching revenue:', err);
      setError('Cannot load sales data.');
    }
  };

  useEffect(() => {
    fetchOrders(activeTab);
    fetchMenuItems();
    fetchRevenue();
    const interval = setInterval(() => {
      fetchOrders(activeTab);
      fetchRevenue();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`, { status });
      await fetchOrders(activeTab);
      setError(null);
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Cannot update order.');
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
      items: validItems,
      paymentMethod: order.paymentMethod || ''
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
        status: editingOrder.status,
        paymentMethod: editingOrder.paymentMethod
      });
      await fetchOrders(activeTab);
      setEditingOrder(null);
      setError(null);
    } catch (err) {
      console.error('Error saving order:', err);
      setError('Cannot save order.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await axios.delete(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`);
        await fetchOrders(activeTab);
        setError(null);
      } catch (err) {
        console.error('Error canceling order:', err);
        setError('Cannot cancel order.');
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
                font-family: Arial, sans-serif; 
                font-size: 14px; 
                line-height: 1.4; 
                width: 80mm; 
                color: #000; 
                background: #fff; 
              }
              .container { padding: 5mm; text-align: center; }
              .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              .table-row { display: flex; justify-content: space-between; }
              .table-row.header { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; }
              .item-name { text-align: left; width: 50%; overflow-wrap: break-word; }
              .item-qty { text-align: center; width: 15%; }
              .item-total { text-align: right; width: 35%; }
              .total { font-weight: bold; margin-top: 5px; }
              .footer { margin-top: 10px; font-size: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">GSaheb Cafe</div>
            <div>Table ${order.tableNumber} | Order #${order.orderNumber}</div>
            <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
            <div>Paid By: ${order.paymentMethod || 'Unknown'}</div>
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
      await axios.post('https://cafe-backend-ay2n.onrender.com/api/menu', {
        name: newItem.name,
        category: newItem.category,
        price: parseFloat(newItem.price),
        description: newItem.description,
        isAvailable: newItem.isAvailable
      });
      await fetchMenuItems();
      setNewItem({
        name: '',
        category: '',
        price: '',
        description: '',
        isAvailable: true
      });
      setError(null);
    } catch (err) {
      console.error('Error adding menu item:', err);
      setError('Cannot add item. Check all fields.');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`https://cafe-backend-ay2n.onrender.com/api/menu/${itemId}`);
        await fetchMenuItems();
        setError(null);
      } catch (err) {
        console.error('Error deleting menu item:', err);
        setError('Cannot delete item.');
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
      setError('Cannot update availability.');
    }
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

  const filteredOrders = orders.filter(order => {
    const tabStatus = {
      'New Orders': 'Pending',
      'Ready Orders': 'Prepared',
      'Paid Bills': 'Completed'
    }[activeTab];
    return order.status === tabStatus;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6 flex items-center justify-center text-gray-800">
          <FaUtensils className="mr-3 text-amber-600 text-4xl" /> GSaheb Cafe - Operator Dashboard
        </h1>

        {error && (
          <p className="text-center text-red-600 mb-6 bg-red-100 p-4 rounded-lg text-lg">{error}</p>
        )}

        {/* Export Revenue Button */}
        <div className="mb-6 flex justify-center">
          <button
            className="px-6 py-3 rounded-lg text-white text-lg font-medium flex items-center hover:bg-amber-600 transition-colors"
            style={{ backgroundColor: '#b45309' }}
            onClick={exportRevenueCSV}
            aria-label="Download sales report"
          >
            <FaFileExport className="mr-2 text-xl" /> Download Sales Report
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 bg-white rounded-lg shadow-md p-6">
          {[
            { name: 'New Orders', icon: <FaClock className="text-2xl" /> },
            { name: 'Ready Orders', icon: <FaCheck className="text-2xl" /> },
            { name: 'Paid Bills', icon: <FaRupeeSign className="text-2xl" /> },
            { name: 'Menu', icon: <FaHamburger className="text-2xl" /> }
          ].map(tab => (
            <button
              key={tab.name}
              className="flex items-center px-6 py-3 rounded-lg text-lg font-medium transition-colors hover:bg-amber-100"
              style={{
                backgroundColor: activeTab === tab.name ? '#b45309' : '#ffffff',
                color: activeTab === tab.name ? '#ffffff' : '#1f2937',
                boxShadow: activeTab === tab.name ? '0 4px 6px rgba(0, 0, 0, 0.2)' : 'none'
              }}
              onClick={() => setActiveTab(tab.name)}
              aria-label={`Switch to ${tab.name}`}
            >
              {tab.icon}
              <span className="ml-3">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Management */}
        {activeTab === 'Menu' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-800">
              <FaHamburger className="mr-3 text-amber-600 text-3xl" /> Manage Menu
            </h2>

            {/* Add New Item Form */}
            <div className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-4 flex items-center text-gray-700">
                <FaPlus className="mr-3 text-2xl" /> Add New Item
              </h3>
              <form onSubmit={handleAddMenuItem} className="space-y-6">
                <div>
                  <label className="block text-gray-700 text-lg font-medium" htmlFor="item-name">Item Name</label>
                  <input
                    id="item-name"
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                    required
                    aria-label="Item name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-lg font-medium" htmlFor="item-category">Category</label>
                  <select
                    id="item-category"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                    required
                    aria-label="Item category"
                  >
                    <option value="">Select Category</option>
                    {['Main Course', 'Drinks', 'Street Food', 'Salads', 'Desserts'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-lg font-medium" htmlFor="item-price">Price (₹)</label>
                  <input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                    required
                    aria-label="Item price"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-lg font-medium" htmlFor="item-description">Description (Optional)</label>
                  <textarea
                    id="item-description"
                    value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                    rows="3"
                    aria-label="Item description"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.isAvailable}
                      onChange={e => setNewItem({ ...newItem, isAvailable: e.target.checked })}
                      className="mr-3 h-5 w-5"
                      aria-label="Item available"
                    />
                    <span className="text-gray-700 text-lg">Available for Sale</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-amber-600 transition-colors"
                  style={{ backgroundColor: '#b45309' }}
                  aria-label="Add new item"
                >
                  <FaPlus className="mr-2 text-xl" /> Add Item
                </button>
              </form>
            </div>

            {/* Menu Items Table */}
            <h3 className="text-xl font-medium mb-4 flex items-center text-gray-700">
              <FaList className="mr-3 text-2xl" /> Menu Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-4 text-lg font-medium">Name</th>
                    <th className="p-4 text-lg font-medium">Category</th>
                    <th className="p-4 text-lg font-medium">Price</th>
                    <th className="p-4 text-lg font-medium">Available</th>
                    <th className="p-4 text-lg font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-600 text-lg">No menu items found.</td>
                    </tr>
                  ) : (
                    menuItems.map(item => (
                      <tr key={item._id} className="border-b hover:bg-amber-50">
                        <td className="p-4 text-lg">{item.name}</td>
                        <td className="p-4 text-lg">{item.category}</td>
                        <td className="p-4 text-lg">₹{item.price.toFixed(2)}</td>
                        <td className="p-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={item.isAvailable}
                              onChange={() => handleToggleAvailability(item._id, item.isAvailable)}
                              className="h-5 w-5"
                              aria-label={`Toggle availability for ${item.name}`}
                            />
                            <span className="ml-2 text-lg">{item.isAvailable ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                        <td className="p-4">
                          <button
                            className="px-4 py-2 rounded-lg text-white text-lg hover:bg-red-700 transition-colors"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDeleteMenuItem(item._id)}
                            aria-label={`Delete ${item.name}`}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        {['New Orders', 'Ready Orders', 'Paid Bills'].includes(activeTab) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.length === 0 ? (
              <p className="text-center col-span-full text-gray-600 text-xl">
                No {activeTab.toLowerCase()} found.
              </p>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order._id}
                  className={`bg-white rounded-lg shadow-md p-6 ${
                    newOrderIds.has(order._id) ? 'border-4 border-amber-500 animate-pulse' : ''
                  }`}
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    Table {order.tableNumber} (Order #{order.orderNumber})
                  </h2>
                  <p className="text-gray-600 text-lg mb-2 flex items-center">
                    <FaClock className="mr-2" /> {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <ul className="mb-4 space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-gray-600 text-lg">
                        {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (₹
                        {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-lg font-medium text-gray-800 mb-2">
                    Total: ₹
                    {order.items
                      .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                      .toFixed(2)}
                  </p>
                  <p
                    className={`text-lg font-medium mb-4 ${
                      order.status === 'Pending'
                        ? 'text-red-600'
                        : order.status === 'Prepared'
                        ? 'text-green-600'
                        : 'text-blue-600'
                    }`}
                  >
                    Status: {order.status === 'Pending' ? 'New' : order.status === 'Prepared' ? 'Ready' : 'Paid'}
                  </p>
                  {order.status === 'Completed' && (
                    <p className="text-lg font-medium text-gray-800 mb-4">
                      Paid By: {order.paymentMethod || 'Unknown'}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-blue-700 transition-colors"
                      style={{ backgroundColor: '#2563eb' }}
                      onClick={() => handleEditOrder(order)}
                      aria-label={`Edit order ${order.orderNumber}`}
                    >
                      <FaEdit className="mr-2 text-xl" /> View/Edit
                    </button>
                    {order.status === 'Pending' && (
                      <>
                        <button
                          className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-green-700 transition-colors"
                          style={{ backgroundColor: '#16a34a' }}
                          onClick={() => handleStatusUpdate(order._id, 'Prepared')}
                          aria-label={`Mark order ${order.orderNumber} as ready`}
                        >
                          <FaCheck className="mr-2 text-xl" /> Mark as Ready
                        </button>
                        <button
                          className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-red-700 transition-colors"
                          style={{ backgroundColor: '#dc2626' }}
                          onClick={() => handleCancelOrder(order._id)}
                          aria-label={`Cancel order ${order.orderNumber}`}
                        >
                          <FaTimes className="mr-2 text-xl" /> Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'Prepared' && (
                      <>
                        <button
                          className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-blue-600 transition-colors"
                          style={{ backgroundColor: '#1e40af' }}
                          onClick={() => handlePrintBill(order)}
                          aria-label={`Print receipt for order ${order.orderNumber}`}
                        >
                          <FaPrint className="mr-2 text-xl" /> Print Receipt
                        </button>
                        <button
                          className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-green-700 transition-colors"
                          style={{ backgroundColor: '#16a34a' }}
                          onClick={() => handleStatusUpdate(order._id, 'Completed')}
                          aria-label={`Mark order ${order.orderNumber} as paid`}
                        >
                          <FaCheck className="mr-2 text-xl" /> Mark as Paid
                        </button>
                      </>
                    )}
                    {order.status === 'Completed' && (
                      <button
                        className="px-4 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-blue-600 transition-colors"
                        style={{ backgroundColor: '#1e40af' }}
                        onClick={() => handlePrintBill(order)}
                        aria-label={`Print receipt for order ${order.orderNumber}`}
                      >
                        <FaPrint className="mr-2 text-xl" /> Print Receipt
                      </button>
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
            <div className="bg-white rounded-lg p-6 w-full max-w-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
                <FaEdit className="mr-3 text-amber-600 text-3xl" /> Edit Order - Table {editingOrder.tableNumber}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 text-lg font-medium" htmlFor="table-number">Table Number</label>
                  <input
                    id="table-number"
                    type="number"
                    min="1"
                    value={editingOrder.tableNumber}
                    onChange={e => setEditingOrder({ ...editingOrder, tableNumber: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                    aria-label="Change table number"
                  />
                </div>
                {(editingOrder.status === 'Pending' || editingOrder.status === 'Prepared') && (
                  <div>
                    <label className="block text-gray-700 text-lg font-medium" htmlFor="order-status">Order Status</label>
                    <select
                      id="order-status"
                      value={editingOrder.status}
                      onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                      className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                      aria-label="Change order status"
                    >
                      <option value="Pending">New</option>
                      <option value="Prepared">Ready</option>
                    </select>
                  </div>
                )}
                {editingOrder.status === 'Completed' && (
                  <div>
                    <label className="block text-gray-700 text-lg font-medium" htmlFor="payment-method">Paid By</label>
                    <select
                      id="payment-method"
                      value={editingOrder.paymentMethod}
                      onChange={e => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                      className="w-full border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
                      aria-label="Select payment method"
                    >
                      <option value="">Select Payment Method</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 text-lg font-medium mb-2">Items</label>
                  {editingOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 mb-4 flex-wrap gap-4">
                      <select
                        className="flex-1 border rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-amber-500"
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
                            {menuItem.name} (₹{menuItem.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        className="border rounded-lg px-4 py-3 w-20 text-lg focus:ring-2 focus:ring-amber-500"
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...editingOrder.items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                        aria-label={`Quantity for item ${index + 1}`}
                      />
                      <button
                        className="text-red-600 hover:text-red-800 text-lg"
                        onClick={() => {
                          const newItems = editingOrder.items.filter((_, i) => i !== index);
                          setEditingOrder({ ...editingOrder, items: newItems });
                        }}
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-blue-600 hover:text-blue-800 flex items-center text-lg"
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
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                <button
                  className="px-6 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-gray-700 transition-colors"
                  style={{ backgroundColor: '#4b5563' }}
                  onClick={() => setEditingOrder(null)}
                  aria-label="Cancel changes"
                >
                  <FaTimes className="mr-2 text-xl" /> Cancel
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-white text-lg font-medium flex items-center justify-center hover:bg-amber-600 transition-colors"
                  style={{ backgroundColor: '#b45309' }}
                  onClick={handleSaveEdit}
                  aria-label="Save changes"
                >
                  <FaCheck className="mr-2 text-xl" /> Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorDashboard;