import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils, FaPlus, FaTrash, FaEdit, FaFileExport, FaCheck, FaRupeeSign } from 'react-icons/fa';

function OperatorDashboard() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '', isAvailable: true });
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Orders');

  const fetchOrders = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/orders');
      const sortedOrders = res.data
        .filter(order => order.tableNumber != null)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sortedOrders);
      setError(null);
    } catch (err) {
      setError('Failed to load orders.');
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/menu/operator');
      setMenuItems(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load menu.');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}/status`, 
        { status },
        { headers: { 'x-operator-token': process.env.REACT_APP_OPERATOR_TOKEN } }
      );
      setOrders(orders.map(o => o._id === orderId ? res.data : o));
      setError(null);
    } catch (err) {
      setError('Failed to update order status.');
    }
  };

  const markOrderPaid = async (orderId) => {
    try {
      const res = await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}/mark-paid`,
        {},
        { headers: { 'x-operator-token': process.env.REACT_APP_OPERATOR_TOKEN } }
      );
      setOrders(orders.map(o => o._id === orderId ? res.data : o));
      setError(null);
    } catch (err) {
      setError('Failed to mark order as paid.');
    }
  };

  const addMenuItem = async () => {
    try {
      const res = await axios.post('https://cafe-backend-ay2n.onrender.com/api/menu',
        newItem,
        { headers: { 'x-operator-token': process.env.REACT_APP_OPERATOR_TOKEN } }
      );
      setMenuItems([...menuItems, res.data]);
      setNewItem({ name: '', description: '', price: '', category: '', isAvailable: true });
      setError(null);
    } catch (err) {
      setError('Failed to add menu item.');
    }
  };

  const updateMenuItem = async () => {
    try {
      const res = await axios.put(`https://cafe-backend-ay2n.onrender.com/api/menu/${editingItem._id}`,
        editingItem,
        { headers: { 'x-operator-token': process.env.REACT_APP_OPERATOR_TOKEN } }
      );
      setMenuItems(menuItems.map(item => item._id === editingItem._id ? res.data : item));
      setEditingItem(null);
      setError(null);
    } catch (err) {
      setError('Failed to update menu item.');
    }
  };

  const deleteMenuItem = async (id) => {
    try {
      await axios.delete(`https://cafe-backend-ay2n.onrender.com/api/menu/${id}`,
        { headers: { 'x-operator-token': process.env.REACT_APP_OPERATOR_TOKEN } }
      );
      setMenuItems(menuItems.filter(item => item._id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete menu item.');
    }
  };

  const exportOrdersCSV = () => {
    const csvContent = [
      ['Order Number', 'Table', 'Status', 'Total', 'Items', 'Created At'],
      ...orders.map(order => [
        order.orderNumber,
        order.tableNumber,
        order.status,
        order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2),
        order.items.map(item => `${item.quantity}x ${item.itemId ? item.itemId.name : 'Unknown'}`).join('; '),
        new Date(order.createdAt).toLocaleString()
      ])
    ]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSahebCafe_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 flex items-center justify-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> Operator Dashboard - GSaheb Cafe
      </h1>

      {error && (
        <p className="text-center text-red-600 mb-4 bg-red-100 p-3 rounded-lg">{error}</p>
      )}

      <div className="flex space-x-2 mb-6">
        {['Orders', 'Menu'].map(tab => (
          <button
            key={tab}
            className={`flex-1 py-2 px-4 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              activeTab === tab ? 'text-white' : 'bg-white text-gray-700 hover:bg-amber-100'
            }`}
            style={{ backgroundColor: activeTab === tab ? '#b45309' : '' }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Orders' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Orders</h2>
            <button
              className="px-4 py-2 rounded-lg text-white flex items-center hover:bg-amber-600 transition-colors"
              style={{ backgroundColor: '#b45309' }}
              onClick={exportOrdersCSV}
            >
              <FaFileExport className="mr-2" /> Export Orders
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-gray-600">No orders available.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order._id} className="border rounded-lg p-4 bg-gray-50 order-card">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Order #{order.orderNumber} - Table {order.tableNumber}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'Pending' ? 'bg-red-100 text-red-600' :
                        order.status === 'Prepared' ? 'bg-yellow-100 text-yellow-600' :
                        order.status === 'Completed' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    Placed at: {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {item.quantity}x {item.itemId ? item.itemId.name : 'Unknown'} -{' '}
                        <FaRupeeSign className="inline mr-1" />
                        {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-lg font-bold mt-2 flex items-center">
                    Total: <FaRupeeSign className="ml-1 mr-1" />
                    {order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0).toFixed(2)}
                  </p>
                  <div className="mt-3 flex space-x-2">
                    {order.status !== 'Paid' && (
                      <>
                        <button
                          className="px-3 py-1 rounded-lg text-white flex items-center hover:bg-green-600"
                          style={{ backgroundColor: '#16a34a' }}
                          onClick={() => updateOrderStatus(order._id, order.status === 'Pending' ? 'Prepared' : 'Completed')}
                        >
                          <FaCheck className="mr-2" />
                          {order.status === 'Pending' ? 'Mark as Prepared' : 'Mark as Completed'}
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-white flex items-center hover:bg-blue-600"
                          style={{ backgroundColor: '#3b82f6' }}
                          onClick={() => markOrderPaid(order._id)}
                        >
                          <FaRupeeSign className="mr-2" /> Mark as Paid
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Menu' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800">Menu Management</h2>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={editingItem ? editingItem.name : newItem.name}
                onChange={(e) => editingItem 
                  ? setEditingItem({ ...editingItem, name: e.target.value })
                  : setNewItem({ ...newItem, name: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Description"
                value={editingItem ? editingItem.description : newItem.description}
                onChange={(e) => editingItem 
                  ? setEditingItem({ ...editingItem, description: e.target.value })
                  : setNewItem({ ...newItem, description: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={editingItem ? editingItem.price : newItem.price}
                onChange={(e) => editingItem 
                  ? setEditingItem({ ...editingItem, price: e.target.value })
                  : setNewItem({ ...newItem, price: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <select
                value={editingItem ? editingItem.category : newItem.category}
                onChange={(e) => editingItem 
                  ? setEditingItem({ ...editingItem, category: e.target.value })
                  : setNewItem({ ...newItem, category: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Select Category</option>
                {['Main Course', 'Drinks', 'Street Food', 'Salads', 'Desserts'].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem ? editingItem.isAvailable : newItem.isAvailable}
                  onChange={(e) => editingItem 
                    ? setEditingItem({ ...editingItem, isAvailable: e.target.checked })
                    : setNewItem({ ...newItem, isAvailable: e.target.checked })}
                  className="mr-2"
                />
                Available
              </label>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                className="px-4 py-2 rounded-lg text-white flex items-center hover:bg-amber-600"
                style={{ backgroundColor: '#b45309' }}
                onClick={editingItem ? updateMenuItem : addMenuItem}
              >
                <FaPlus className="mr-2" /> {editingItem ? 'Update Item' : 'Add Item'}
              </button>
              {editingItem && (
                <button
                  className="px-4 py-2 rounded-lg text-white flex items-center hover:bg-red-600"
                  style={{ backgroundColor: '#ef4444' }}
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">Menu Items</h3>
          {menuItems.length === 0 ? (
            <p className="text-gray-600">No menu items available.</p>
          ) : (
            <div className="space-y-4">
              {menuItems.map(item => (
                <div key={item._id} className="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm font-medium flex items-center">
                      <FaRupeeSign className="mr-1" />{item.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Category: {item.category || 'None'}</p>
                    <p className="text-sm text-gray-600">
                      Status: {item.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="px-3 py-1 rounded-lg text-white flex items-center hover:bg-amber-600"
                      style={{ backgroundColor: '#b45309' }}
                      onClick={() => setEditingItem(item)}
                    >
                      <FaEdit className="mr-2" /> Edit
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg text-white flex items-center hover:bg-red-600"
                      style={{ backgroundColor: '#ef4444' }}
                      onClick={() => deleteMenuItem(item._id)}
                    >
                      <FaTrash className="mr-2" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OperatorDashboard;