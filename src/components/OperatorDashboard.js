import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUtensils, FaHamburger, FaPrint, FaRupeeSign, FaFileExport, FaBars, FaClock, FaMoneyBillWave, FaMobileAlt, FaCreditCard, FaWallet, FaQuestionCircle, FaChartBar } from 'react-icons/fa';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)));
  const [reportEndDate, setReportEndDate] = useState(new Date());
  const [reportStatusFilter, setReportStatusFilter] = useState('Completed');
  const [reportPaymentFilter, setReportPaymentFilter] = useState('All');
  const [showItemsPopover, setShowItemsPopover] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const modalRef = useRef(null);
  const paymentModalRef = useRef(null);

  const fetchOrders = async (tab) => {
    try {
      const statusMap = {
        'New Orders': 'pending',
        'Served Orders': 'prepared',
        'Paid Bills': 'completed'
      };
      const url = `https://cafe-backend-ay2n.onrender.com/api/orders?status=${statusMap[tab]}`;
      const res = await axios.get(url);
      console.log('Orders fetched:', res.data);
      const newOrders = res.data.filter(order => order.tableNumber != null);
      const sortedOrders = newOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (orders.length > 0 && tab === 'New Orders') {
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
      console.log(`Refreshing orders for ${activeTab} at ${new Date().toISOString()}`);
      fetchOrders(activeTab);
      if (activeTab === 'Paid Bills') fetchRevenue();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setEditingOrder(null);
      }
      if (paymentModalRef.current && !paymentModalRef.current.contains(event.target)) {
        setShowPaymentModal(null);
        setSelectedPaymentMethod('');
      }
      if (!event.target.closest('.items-button') && !event.target.closest('.items-popover')) {
        setShowItemsPopover(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setEditingOrder(null);
        setShowPaymentModal(null);
        setSelectedPaymentMethod('');
        setShowItemsPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleStatusUpdate = async (orderId, status, paymentMethod = null) => {
    try {
      const updateData = { status };
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      await axios.put(`https://cafe-backend-ay2n.onrender.com/api/orders/${orderId}`, updateData);
      await fetchOrders(activeTab);
      setError(null);
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Cannot update order: ' + (err.response?.data?.error || 'Server error'));
    }
  };

  const handleMarkAsPaid = (orderId) => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method.');
      return;
    }
    handleStatusUpdate(orderId, 'Completed', selectedPaymentMethod);
    setShowPaymentModal(null);
    setSelectedPaymentMethod('');
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
        paymentMethod: editingOrder.paymentMethod || null
      });
      await fetchOrders(activeTab);
      setEditingOrder(null);
      setError(null);
    } catch (err) {
      console.error('Error saving order:', err);
      setError('Cannot save order: ' + (err.response?.data?.error || 'Server error'));
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
                font-family: Roboto, Arial, sans-serif; 
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
            <div>Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
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
    // Filter orders based on selected filters
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const matchesDate =
        orderDate >= new Date(reportStartDate.setHours(0, 0, 0, 0)) &&
        orderDate <= new Date(reportEndDate.setHours(23, 59, 59, 999));
      const matchesStatus = reportStatusFilter === 'All' || order.status === reportStatusFilter;
      const matchesPayment =
        reportPaymentFilter === 'All' ||
        order.paymentMethod === reportPaymentFilter ||
        (reportPaymentFilter === 'Unknown' && !order.paymentMethod);
      return matchesDate && matchesStatus && matchesPayment;
    });

    // Format items for each order
    const formatItems = (items) => {
      return items
        .map(item => `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted]'}`)
        .join(', ');
    };

    // Format date and time as MM/DD/YYYY HH:mm:ss
    const formatDateTime = (date) => {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Create CSV content
    const csvContent = [
      ['Order Number', 'Date and Time', 'Items', 'Total (₹)', 'Status', 'Payment Method'], // Headers
      ...filteredOrders.map(order => [
        order.orderNumber,
        formatDateTime(order.createdAt),
        formatItems(order.items),
        order.items
          .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
          .toFixed(2),
        order.status,
        order.paymentMethod || 'Unknown'
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(',')) // Wrap each cell in quotes to handle commas in items
      .join('\n');

    // Generate and download the CSV file
    const startFormatted = formatDateTime(reportStartDate).split(' ')[0].replace(/\//g, '-');
    const endFormatted = formatDateTime(reportEndDate).split(' ')[0].replace(/\//g, '-');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSahebCafe_SalesReport_${startFormatted}_to_${endFormatted}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter(order => {
    const tabStatus = {
      'New Orders': 'Pending',
      'Served Orders': 'Prepared',
      'Paid Bills': 'Completed'
    }[activeTab];
    if (activeTab === 'Paid Bills') {
      const orderDate = new Date(order.createdAt);
      return (
        order.status === tabStatus &&
        orderDate >= new Date(startDate.setHours(0, 0, 0, 0)) &&
        orderDate <= new Date(endDate.setHours(23, 59, 59, 999))
      );
    }
    return order.status === tabStatus;
  });

  const paymentMethodSummary = filteredOrders.reduce((acc, order) => {
    const method = order.paymentMethod || 'Unknown';
    const total = order.items.reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0);
    acc[method] = (acc[method] || 0) + total;
    return acc;
  }, {});

  const paymentMethodBadge = (method) => {
    const styles = {
      Cash: { bg: '#16a34a', icon: <FaMoneyBillWave className="mr-1" /> },
      UPI: { bg: '#2563eb', icon: <FaMobileAlt className="mr-1" /> },
      Card: { bg: '#f59e0b', icon: <FaCreditCard className="mr-1" /> },
      Other: { bg: '#4b5563', icon: <FaWallet className="mr-1" /> },
      Unknown: { bg: '#dc2626', icon: <FaQuestionCircle className="mr-1" /> }
    };
    const { bg, icon } = styles[method] || styles.Unknown;
    return (
      <span className="px-2 py-1 rounded-full text-white text-sm sm:text-base flex items-center" style={{ backgroundColor: bg }}>
        {icon}
        {method}
      </span>
    );
  };

  const renderItems = (items) => {
    const summary = items
      .slice(0, 2)
      .map(item => `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted]'}`)
      .join(', ');
    const more = items.length > 2 ? `, +${items.length - 2} more` : '';
    return `${summary}${more}`;
  };

  const renderTableRows = () => {
    const minRows = 5;
    const rows = [];
    
    filteredOrders.forEach((order, index) => {
      rows.push(
        <tr
          key={order._id}
          className={`border-b ${
            newOrderIds.has(order._id)
              ? 'animate-pulse bg-amber-200 border-l-4 border-amber-500'
              : index % 2 === 0
              ? 'bg-gray-50'
              : 'bg-white'
          } hover:bg-gray-100`}
        >
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">Table {order.tableNumber}</td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">#{order.orderNumber}</td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center hidden md:table-cell w-1/12">
            {new Date(order.createdAt).toLocaleDateString()}
          </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base w-4/12 relative">
            <button
              className="items-button text-blue-600 hover:underline"
              onMouseEnter={(e) => {
                setShowItemsPopover(order._id);
                const rect = e.target.getBoundingClientRect();
                const popover = document.getElementById(`popover-${order._id}`);
                if (popover) {
                  const viewportHeight = window.innerHeight;
                  const viewportWidth = window.innerWidth;
                  const popoverHeight = popover.offsetHeight || 200;
                  const popoverWidth = popover.offsetWidth || 200;
                  let top = rect.bottom + window.scrollY + 8;
                  let left = rect.left + window.scrollX;
                  if (rect.bottom + popoverHeight > viewportHeight) {
                    top = rect.top + window.scrollY - popoverHeight - 8;
                  }
                  if (left + popoverWidth > viewportWidth) {
                    left = viewportWidth - popoverWidth - 8;
                  }
                  if (left < 8) left = 8;
                  popover.style.top = `${top}px`;
                  popover.style.left = `${left}px`;
                }
              }}
              onClick={() => {
                setShowItemsPopover(showItemsPopover === order._id ? null : order._id);
              }}
              aria-label={`View items for order ${order.orderNumber}`}
            >
              {renderItems(order.items)}
            </button>
            {showItemsPopover === order._id && (
              <div
                id={`popover-${order._id}`}
                className="items-popover absolute z-30 bg-white border rounded-lg p-2 max-w-[80vw] sm:max-w-xs w-full shadow-lg"
              >
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted]'} (₹
                      {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">
            ₹{order.items
              .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
              .toFixed(2)}
          </td>
          <td
            className={`p-3 sm:p-4 text-sm sm:text-base text-center w-1/12 ${
              order.status === 'Pending'
                ? 'text-red-600'
                : order.status === 'Prepared'
                ? 'text-green-600'
                : 'text-blue-600'
            }`}
          >
            {order.status === 'Pending' ? 'New' : order.status === 'Prepared' ? 'Served' : 'Paid'}
          </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">
            {activeTab === 'Paid Bills' ? paymentMethodBadge(order.paymentMethod || 'Unknown') : 'Not Paid'}
          </td>
          <td className="p-3 sm:p-4 flex gap-2 justify-center w-2/12">
            <button
              className="p-2 rounded text-white hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: '#2563eb' }}
              onClick={() => handleEditOrder(order)}
              aria-label={`Edit order ${order.orderNumber}`}
            >
              <FaEdit />
            </button>
            {order.status === 'Pending' && (
              <>
                <button
                  className="p-2 rounded text-white hover:bg-green-700 transition-colors"
                  style={{ backgroundColor: '#16a34a' }}
                  onClick={() => handleStatusUpdate(order._id, 'Prepared')}
                  aria-label={`Mark order ${order.orderNumber} as served`}
                >
                  <FaCheck />
                </button>
                <button
                  className="p-2 rounded text-white hover:bg-red-700 transition-colors"
                  style={{ backgroundColor: '#dc2626' }}
                  onClick={() => handleCancelOrder(order._id)}
                  aria-label={`Cancel order ${order.orderNumber}`}
                >
                  <FaTimes />
                </button>
              </>
            )}
            {order.status === 'Prepared' && (
              <>
                <button
                  className="p-2 rounded text-white hover:bg-blue-900 transition-colors"
                  style={{ backgroundColor: '#1e40af' }}
                  onClick={() => handlePrintBill(order)}
                  aria-label={`Print receipt for order ${order.orderNumber}`}
                >
                  <FaPrint />
                </button>
                <button
                  className="p-2 rounded text-white hover:bg-green-700 transition-colors"
                  style={{ backgroundColor: '#16a34a' }}
                  onClick={() => setShowPaymentModal(order._id)}
                  aria-label={`Mark order ${order.orderNumber} as paid`}
                >
                  <FaCheck />
                </button>
              </>
            )}
            {order.status === 'Completed' && (
              <button
                className="p-2 rounded text-white hover:bg-blue-900 transition-colors"
                style={{ backgroundColor: '#1e40af' }}
                onClick={() => handlePrintBill(order)}
                aria-label={`Print receipt for order ${order.orderNumber}`}
              >
                <FaPrint />
              </button>
            )}
          </td>
        </tr>
      );
    });

    while (rows.length < minRows) {
      rows.push(
        <tr key={`placeholder-${rows.length}`} className="border-b bg-white">
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center hidden md:table-cell"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center"> </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base"> </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-roboto">
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-amber-50 shadow-lg transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-30`}
      >
        <div className="p-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            <FaUtensils className="mr-2 text-amber-600" /> GSaheb Cafe
          </h2>
          <h3 className="text-lg sm:text-xl font-medium text-gray-600 mt-2">Operator Dashboard</h3>
        </div>
        <nav className="mt-4">
          {[
            { name: 'New Orders', icon: <FaClock className="text-2xl" /> },
            { name: 'Served Orders', icon: <FaCheck className="text-2xl" /> },
            { name: 'Paid Bills', icon: <FaRupeeSign className="text-2xl" /> },
            { name: 'Menu', icon: <FaHamburger className="text-2xl" /> },
            { name: 'Reports', icon: <FaChartBar className="text-2xl" /> }
          ].map(tab => (
            <button
              key={tab.name}
              className="w-full flex items-center px-6 py-4 text-base sm:text-lg font-medium text-gray-800 hover:bg-amber-100 transition-colors"
              style={{
                backgroundColor: activeTab === tab.name ? '#b45309' : 'transparent',
                color: activeTab === tab.name ? '#ffffff' : '#1f2937'
              }}
              onClick={() => {
                setActiveTab(tab.name);
                setIsSidebarOpen(false);
              }}
              aria-label={`Switch to ${tab.name}`}
            >
              {tab.icon}
              <span className="ml-3">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-4 sm:p-6 md:ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              className="md:hidden p-2 text-amber-600 text-2xl"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>
            <div className="flex-1"></div>
          </div>

          {error && (
            <div className="mb-6 sm:mb-8 bg-red-100 p-4 rounded-lg flex items-center justify-between shadow-sm">
              <p className="text-red-600 text-base sm:text-lg">{error}</p>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => setError(null)}
                aria-label="Close error message"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {activeTab === 'Menu' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
                <FaHamburger className="mr-3 text-amber-600 text-2xl sm:text-3xl" /> Manage Menu
              </h2>
              <div className="mb-6 sm:mb-8 bg-amber-50 p-4 sm:p-6 rounded-lg shadow-sm">
                <h3 className="text-lg sm:text-xl font-medium mb-4 flex items-center text-gray-700">
                  <FaPlus className="mr-3 text-xl sm:text-2xl" /> Add New Item
                </h3>
                <form onSubmit={handleAddMenuItem} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-gray-700 text-base sm:text-lg font-medium" htmlFor="item-name">Item Name</label>
                    <input
                      id="item-name"
                      type="text"
                      value={newItem.name}
                      onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base sm:text-lg focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                      required
                      aria-label="Item name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-base sm:text-lg font-medium" htmlFor="item-category">Category</label>
                    <select
                      id="item-category"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base sm:text-lg focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
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
                    <label className="block text-gray-700 text-base sm:text-lg font-medium" htmlFor="item-price">Price (₹)</label>
                    <input
                      id="item-price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base sm:text-lg focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                      required
                      aria-label="Item price"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-base sm:text-lg font-medium" htmlFor="item-description">Description (Optional)</label>
                    <textarea
                      id="item-description"
                      value={newItem.description}
                      onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base sm:text-lg focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
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
                        className="mr-3 h-4 w-4 sm:h-5 sm:w-5"
                        aria-label="Item available"
                      />
                      <span className="text-gray-700 text-base sm:text-lg">Available for Sale</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-white text-base sm:text-lg font-medium flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm"
                    style={{ backgroundColor: '#b45309' }}
                    aria-label="Add new item"
                  >
                    <FaPlus className="mr-2 text-lg sm:text-xl" /> Add Item
                  </button>
                </form>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-4 flex items-center text-gray-700">
                <FaHamburger className="mr-3 text-xl sm:text-2xl" /> Menu Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border shadow-sm">
                  <thead>
                    <tr className="bg-amber-100">
                      <th className="p-4 sm:p-6 text-base sm:text-lg font-medium w-1/4">Name</th>
                      <th className="p-4 sm:p-6 text-base sm:text-lg font-medium w-1/4">Category</th>
                      <th className="p-4 sm:p-6 text-base sm:text-lg font-medium w-1/6">Price</th>
                      <th className="p-4 sm:p-6 text-base sm:text-lg font-medium w-1/6">Available</th>
                      <th className="p-4 sm:p-6 text-base sm:text-lg font-medium w-1/6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 sm:p-6 text-center text-gray-600 text-base sm:text-lg">No menu items found.</td>
                      </tr>
                    ) : (
                      menuItems.map((item, index) => (
                        <tr key={item._id} className={`border-b ${index % 2 === 0 ? 'bg-amber-50' : 'bg-white'} hover:bg-amber-100`}>
                          <td className="p-4 sm:p-6 text-base sm:text-lg">{item.name}</td>
                          <td className="p-4 sm:p-6 text-base sm:text-lg">{item.category}</td>
                          <td className="p-4 sm:p-6 text-base sm:text-lg">₹{item.price.toFixed(2)}</td>
                          <td className="p-4 sm:p-6">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={item.isAvailable}
                                onChange={() => handleToggleAvailability(item._id, item.isAvailable)}
                                className="h-4 w-4 sm:h-5 sm:w-5"
                                aria-label={`Toggle availability for ${item.name}`}
                              />
                              <span className="ml-2 text-base sm:text-lg">{item.isAvailable ? 'Yes' : 'No'}</span>
                            </label>
                          </td>
                          <td className="p-4 sm:p-6">
                            <button
                              className="px-4 py-2 rounded-lg text-white text-base hover:bg-red-700 transition-colors shadow-sm"
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

          {activeTab === 'Reports' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
                <FaChartBar className="mr-3 text-amber-600 text-2xl sm:text-3xl" /> Sales Reports
              </h2>
              <div className="mb-6 sm:mb-8 bg-amber-50 p-3 sm:p-4 rounded-lg shadow-sm">
                <h3 className="text-base sm:text-lg font-medium mb-3 text-gray-700">Report Filters</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
                      <DatePicker
                        selected={reportStartDate}
                        onChange={date => setReportStartDate(date)}
                        maxDate={reportEndDate}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select report start date"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
                      <DatePicker
                        selected={reportEndDate}
                        onChange={date => setReportEndDate(date)}
                        minDate={reportStartDate}
                        maxDate={new Date()}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select report end date"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Status</label>
                      <select
                        value={reportStatusFilter}
                        onChange={e => setReportStatusFilter(e.target.value)}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select order status filter"
                      >
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Prepared">Prepared</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Payment Method</label>
                      <select
                        value={reportPaymentFilter}
                        onChange={e => setReportPaymentFilter(e.target.value)}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select payment method filter"
                      >
                        <option value="All">All</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors shadow-sm"
                      style={{ backgroundColor: '#4b5563' }}
                      onClick={() => {
                        setReportStartDate(new Date(new Date().setDate(new Date().getDate() - 1)));
                        setReportEndDate(new Date());
                        setReportStatusFilter('Completed');
                        setReportPaymentFilter('All');
                      }}
                      aria-label="Reset report filters"
                    >
                      Reset
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg text-white text-sm font-medium flex items-center hover:bg-amber-600 transition-colors shadow-sm"
                      style={{ backgroundColor: '#b45309' }}
                      onClick={exportRevenueCSV}
                      aria-label="Generate sales report"
                    >
                      <FaFileExport className="mr-1 text-sm" /> Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {['New Orders', 'Served Orders', 'Paid Bills'].includes(activeTab) && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">
                {activeTab}
              </h2>

              {activeTab === 'Paid Bills' && (
                <div className="mb-6 sm:mb-8 bg-amber-50 p-3 sm:p-4 rounded-lg shadow-sm">
                  <h3 className="text-base sm:text-lg font-medium mb-3 text-gray-700">Date Filter</h3>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
                      <DatePicker
                        selected={startDate}
                        onChange={date => setStartDate(date)}
                        maxDate={endDate}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select start date"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
                      <DatePicker
                        selected={endDate}
                        onChange={date => setEndDate(date)}
                        minDate={startDate}
                        maxDate={new Date()}
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        aria-label="Select end date"
                      />
                    </div>
                    <button
                      className="px-3 py-1 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors shadow-sm mt-6"
                      style={{ backgroundColor: '#4b5563' }}
                      onClick={() => {
                        setStartDate(new Date(new Date().setDate(new Date().getDate() - 1)));
                        setEndDate(new Date());
                      }}
                      aria-label="Reset date filter"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Paid Bills' && (
                <div className="mb-6 sm:mb-8 bg-amber-50 p-3 sm:p-4 rounded-lg shadow-sm">
                  <h3 className="text-base sm:text-lg font-medium mb-3 text-gray-700">Payment Summary</h3>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(paymentMethodSummary).map(([method, revenue]) => (
                      <div key={method} className="flex items-center">
                        {paymentMethodBadge(method)}
                        <span className="ml-2 text-base sm:text-lg text-gray-800">₹{revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <div className="min-h-[400px] max-h-[400px] overflow-y-auto">
                  <table className="min-w-full text-left border-separate" style={{ borderSpacing: '0 4px' }}>
                    <thead className="sticky top-0 bg-amber-100">
                      <tr>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-1/12">TABLE</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-1/12">ORDER NUMBER</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center hidden md:table-cell w-1/12">DATE</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold w-4/12">ITEMS</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-1/12">TOTAL</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-1/12">STATUS</th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-1/12">
                          {activeTab === 'Paid Bills' ? 'PAID BY' : 'PAYMENT'}
                        </th>
                        <th className="p-3 sm:p-4 text-sm sm:text-base font-semibold text-center w-2/12">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRows()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div ref={paymentModalRef} className="bg-white rounded-lg p-4 w-full max-w-md h-[300px] flex flex-col">
                <div className="p-2 border-b">
                  <h2 className="text-xl font-bold flex items-center text-gray-800">
                    <FaCheck className="mr-3 text-amber-600 text-2xl" /> Mark Order as Paid
                  </h2>
                </div>
                <div className="p-2 flex-1" style={{ overflowY: 'auto' }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-base font-medium" htmlFor="payment-method">Payment Method</label>
                      <select
                        id="payment-method"
                        value={selectedPaymentMethod}
                        onChange={e => setSelectedPaymentMethod(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                        required
                        aria-label="Select payment method"
                      >
                        <option value="">Select Payment Method</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-2 border-t">
                  <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <button
                      className="px-4 py-2 rounded-lg text-white text-base font-medium flex items-center justify-center hover:bg-gray-700 transition-colors shadow-sm"
                      style={{ backgroundColor: '#4b5563' }}
                      onClick={() => {
                        setShowPaymentModal(null);
                        setSelectedPaymentMethod('');
                      }}
                      aria-label="Cancel"
                    >
                      <FaTimes className="mr-2 text-lg" /> Cancel
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white text-base font-medium flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm"
                      style={{ backgroundColor: '#b45309' }}
                      onClick={() => handleMarkAsPaid(showPaymentModal)}
                      aria-label="Confirm payment"
                    >
                      <FaCheck className="mr-2 text-lg" /> Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {editingOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div ref={modalRef} className="bg-white rounded-lg p-4 w-full max-w-md h-[500px] flex flex-col">
                <div className="p-2 border-b">
                  <h2 className="text-base font-bold flex items-center text-gray-800">
                    <FaEdit className="mr-2 text-amber-600 text-lg" /> Edit Order - Table {editingOrder.tableNumber}
                  </h2>
                </div>
                <div className="p-2 flex-1">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium" htmlFor="table-number">Table Number</label>
                      <input
                        id="table-number"
                        type="number"
                        min="1"
                        value={editingOrder.tableNumber}
                        onChange={e => setEditingOrder({ ...editingOrder, tableNumber: parseInt(e.target.value) || 1 })}
                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                        aria-label="Change table number"
                      />
                    </div>
                    {(editingOrder.status === 'Pending' || editingOrder.status === 'Prepared') && (
                      <div>
                        <label className="block text-gray-700 text-sm font-medium" htmlFor="order-status">Order Status</label>
                        <select
                          id="order-status"
                          value={editingOrder.status}
                          onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                          aria-label="Change order status"
                        >
                          <option value="Pending">New</option>
                          <option value="Prepared">Served</option>
                          <option value="Completed">Paid</option>
                        </select>
                      </div>
                    )}
                    {editingOrder.status !== 'Pending' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-medium" htmlFor="payment-method">Paid By</label>
                        <select
                          id="payment-method"
                          value={editingOrder.paymentMethod}
                          onChange={e => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                          aria-label="Select payment method"
                          disabled={editingOrder.status === 'Prepared'}
                        >
                          <option value="">Select Payment Method</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Items</label>
                      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
                        {editingOrder.items.map((item, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', minHeight: '40px' }}>
                            <select
                              style={{ width: '200px', border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.25rem' }}
                              value={item.itemId}
                              onChange={e => {
                                const newItem = menuItems.find(m => m._id === e.target.value) || { _id: e.target.value, name: 'Unknown Item', price: 0 };
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
                              {menuItems.length > 0 ? (
                                menuItems.map(menuItem => (
                                  <option key={menuItem._id} value={menuItem._id}>
                                    {menuItem.name} (₹{menuItem.price.toFixed(2)})
                                  </option>
                                ))
                              ) : (
                                <option value={item.itemId}>{item.name} (₹{item.price.toFixed(2)})</option>
                              )}
                            </select>
                            <input
                              type="number"
                              min="1"
                              style={{ width: '60px', border: '1px solid #d1d5db', borderRadius: '0.25rem', padding: '0.25rem' }}
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...editingOrder.items];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setEditingOrder({ ...editingOrder, items: newItems });
                              }}
                              aria-label={`Quantity for item ${index + 1}`}
                            />
                            <button
                              style={{ color: '#dc2626' }}
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
                          style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}
                          onClick={() => {
                            const defaultItem = menuItems[0] || { _id: 'fallback-id', name: 'Default Item', price: 0 };
                            const newItems = [
                              ...editingOrder.items,
                              { itemId: defaultItem._id, quantity: 1, name: defaultItem.name, price: defaultItem.price }
                            ];
                            setEditingOrder({ ...editingOrder, items: newItems });
                          }}
                          aria-label="Add new item to order"
                        >
                          <FaPlus style={{ marginRight: '0.25rem' }} /> Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 border-t">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-6 py-2 rounded text-white text-sm font-medium flex items-center hover:bg-gray-600"
                      style={{ backgroundColor: '#6b7280' }}
                      onClick={() => setEditingOrder(null)}
                      aria-label="Cancel changes"
                    >
                      <FaTimes className="mr-1" /> Cancel
                    </button>
                    <button
                      className="px-6 py-2 rounded text-white text-sm font-medium flex items-center hover:bg-amber-700"
                      style={{ backgroundColor: '#d97706' }}
                      onClick={handleSaveEdit}
                      aria-label="Save changes"
                    >
                      <FaCheck className="mr-1" /> Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OperatorDashboard;