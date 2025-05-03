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
  const [pendingKOTs, setPendingKOTs] = useState([]);
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

  const fetchPendingKOTs = async () => {
    try {
      const res = await axios.get('https://cafe-backend-ay2n.onrender.com/api/orders/pending-kots');
      setPendingKOTs(res.data);
    } catch (err) {
      console.error('Error fetching pending KOTs:', err);
      setError('Cannot load pending KOTs.');
    }
  };

  const markKOTPrinted = async (orderId, printer) => {
    try {
      await axios.post('https://cafe-backend-ay2n.onrender.com/api/orders/mark-kot-printed', {
        orderId,
        printer
      });
    } catch (err) {
      console.error(`Error marking KOT as printed for ${printer}:`, err);
      setError(`Failed to mark KOT as printed for ${printer}.`);
    }
  };

  const printKOT = (order, printer, kotContent) => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.style.display = 'none';

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 5mm;
              line-height: 1.2;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <pre>${kotContent}</pre>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => {
      markKOTPrinted(order._id, printer);
      document.body.removeChild(iframe);
    }, 1000);
  };

  useEffect(() => {
    fetchOrders(activeTab);
    fetchMenuItems();
    fetchRevenue();
    fetchPendingKOTs();
    const interval = setInterval(() => {
      fetchOrders(activeTab);
      fetchPendingKOTs();
      if (activeTab === 'Paid Bills') fetchRevenue();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    pendingKOTs.forEach(order => {
      if (order.kotPrinter1 && !order.kotPrinter1.printed) {
        printKOT(order, 'Printer 1', order.kotPrinter1.content);
      }
      if (order.kotPrinter2 && !order.kotPrinter2.printed) {
        printKOT(order, 'Printer 2', order.kotPrinter2.content);
      }
    });
  }, [pendingKOTs]);

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
    printWindow.document.write(`<html>
        <head>
          <title>Receipt - GSaheb Cafe</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { 
                margin: 0; 
                font-family: 'Roboto', Arial, sans-serif; 
                font-size: 14px; 
                line-height: 1.4; 
                width: 80mm; 
                color: #333; 
                background: #fff; 
              }
              .container { padding: 5mm; text-align: center; }
              .header { font-size: 18px; font-weight: 600; margin-bottom: 5px; color: #1f2937; }
              .divider { border-top: 1px dashed #6b7280; margin: 5px 0; }
              .table-row { display: flex; justify-content: space-between; padding: 2px 0; }
              .table-row.header { font-weight: 600; border-bottom: 1px solid #6b7280; margin-bottom: 5px; }
              .item-name { text-align: left; width: 50%; overflow-wrap: break-word; }
              .item-qty { text-align: center; width: 15%; }
              .item-total { text-align: right; width: 35%; }
              .total { font-weight: 600; margin-top: 5px; }
              .footer { margin-top: 10px; font-size: 12px; color: #6b7280; }
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
              .map(item => `
                  <div class="table-row">
                    <span class="item-name">${item.itemId ? item.itemId.name : '[Deleted Item]'}</span>
                    <span class="item-qty">${item.quantity}</span>
                    <span class="item-total">₹${item.itemId ? (item.quantity * item.itemId.price).toFixed(2) : '0.00'}</span>
                  </div>
                `)
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

    const formatItems = (items) => {
      return items
        .map(item => `${item.quantity} x ${item.itemId ? item.itemId.name : '[Deleted]'}`)
        .join(', ');
    };

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

    const csvContent = [
      ['Order Number', 'Date and Time', 'Items', 'Total (₹)', 'Status', 'Payment Method'],
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
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

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
      <span className="px-2 py-1 rounded-full text-white text-xs sm:text-sm flex items-center whitespace-nowrap" style={{ backgroundColor: bg }}>
        {icon}
        {method}
      </span>
    );
  };

  const renderItems = (items) => {
    if (items.length === 0) return <div className="text-center">No items</div>;
    const firstItem = items[0] ? `${items[0].quantity} x ${items[0].itemId ? items[0].itemId.name : '[Deleted]'}` : '';
    const secondItem = items[1] ? `${items[1].quantity} x ${items[1].itemId ? items[1].itemId.name : '[Deleted]'}` : '';
    const moreItems = items.length > 2 ? `+${items.length - 2} more` : '';
    return (
      <div className="flex flex-col items-center">
        <span>{firstItem}</span>
        {secondItem && <span>{secondItem}</span>}
        {moreItems && (
          <button
            className="items-button text-blue-600 hover:underline text-sm"
            onMouseEnter={(e) => {
              const orderId = items[0].orderId || items[0]._id;
              setShowItemsPopover(orderId);
              const rect = e.target.getBoundingClientRect();
              const popover = document.getElementById(`popover-${orderId}`);
              if (popover) {
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerHeight;
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
            onClick={(e) => {
              const orderId = items[0].orderId || items[0]._id;
              setShowItemsPopover(showItemsPopover === orderId ? null : orderId);
              e.stopPropagation();
            }}
            aria-label={`View more items`}
          >
            {moreItems}
          </button>
        )}
      </div>
    );
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
              ? 'animate-pulse bg-amber-100 border-l-4 border-amber-400'
              : index % 2 === 0
              ? 'bg-gray-50'
              : 'bg-white'
          } hover:bg-gray-100 transition-colors duration-200`}
        >
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">Table {order.tableNumber}</td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-1/12">#{order.orderNumber}</td>
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center hidden md:table-cell w-1/12">
            {new Date(order.createdAt).toLocaleDateString()}
          </td>
          <td className="p-3 sm:p-4 text-sm sm:text-base w-3/12 relative">
            {renderItems(order.items.map(item => ({ ...item, orderId: order._id })))}
            {showItemsPopover === order._id && (
              <div
                id={`popover-${order._id}`}
                className="items-popover absolute z-30 bg-white border border-gray-200 rounded-lg p-3 max-w-[80vw] sm:max-w-sm w-full shadow-lg"
              >
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
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
          <td className="p-3 sm:p-4 text-sm sm:text-base text-center w-2/12 whitespace-nowrap">
            {activeTab === 'Paid Bills' ? paymentMethodBadge(order.paymentMethod || 'Unknown') : 'Not Paid'}
          </td>
          <td className="p-3 sm:p-4 flex gap-2 justify-center items-center min-w-fit mx-auto">
            <button
              className="p-2 rounded text-white hover:bg-blue-600 transition-colors duration-200 shadow-sm"
              style={{ backgroundColor: '#3b82f6' }}
              onClick={() => handleEditOrder(order)}
              aria-label={`Edit order ${order.orderNumber}`}
            >
              <FaEdit />
            </button>
            {order.status === 'Pending' && (
              <>
                <button
                  className="p-2 rounded text-white hover:bg-green-600 transition-colors duration-200 shadow-sm"
                  style={{ backgroundColor: '#22c55e' }}
                  onClick={() => handleStatusUpdate(order._id, 'Prepared')}
                  aria-label={`Mark order ${order.orderNumber} as served`}
                >
                  <FaCheck />
                </button>
                <button
                  className="p-2 rounded text-white hover:bg-red-600 transition-colors duration-200 shadow-sm"
                  style={{ backgroundColor: '#ef4444' }}
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
                  className="p-2 rounded text-white hover:bg-blue-800 transition-colors duration-200 shadow-sm"
                  style={{ backgroundColor: '#1d4ed8' }}
                  onClick={() => handlePrintBill(order)}
                  aria-label={`Print receipt for order ${order.orderNumber}`}
                >
                  <FaPrint />
                </button>
                <button
                  className="p-2 rounded text-white hover:bg-green-600 transition-colors duration-200 shadow-sm"
                  style={{ backgroundColor: '#22c55e' }}
                  onClick={() => setShowPaymentModal(order._id)}
                  aria-label={`Mark order ${order.orderNumber} as paid`}
                >
                  <FaCheck />
                </button>
              </>
            )}
            {order.status === 'Completed' && (
              <button
                className="p-2 rounded text-white hover:bg-blue-800 transition-colors duration-200 shadow-sm"
                style={{ backgroundColor: '#1d4ed8' }}
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
          <td className="p-3 sm:p-4 text-sm sm:text-base min-w-fit mx-auto"> </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-30 border-r border-gray-200`}
      >
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <FaUtensils className="mr-2 text-amber-600" /> GSaheb Cafe
          </h2>
          <h3 className="text-lg font-medium text-gray-500 mt-2">Operator Dashboard</h3>
        </div>
        <nav className="mt-4">
          {[
            { name: 'New Orders', icon: <FaClock className="text-xl" /> },
            { name: 'Served Orders', icon: <FaCheck className="text-xl" /> },
            { name: 'Paid Bills', icon: <FaRupeeSign className="text-xl" /> },
            { name: 'Menu', icon: <FaHamburger className="text-xl" /> },
            { name: 'Reports', icon: <FaChartBar className="text-xl" /> }
          ].map(tab => (
            <button
              key={tab.name}
              className="w-full flex items-center px-6 py-3 text-base font-medium text-gray-700 hover:bg-amber-50 transition-colors duration-200"
              style={{
                backgroundColor: activeTab === tab.name ? '#fef3c7' : 'transparent',
                color: activeTab === tab.name ? '#d97706' : '#374151'
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
          <div className="flex items-center justify-between mb-6">
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
            <div className="mb-6 bg-red-50 p-4 rounded-lg flex items-center justify-between shadow-sm border border-red-200">
              <p className="text-red-600 text-base">{error}</p>
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-800">
                <FaHamburger className="mr-3 text-amber-600 text-2xl" /> Manage Menu
              </h2>
              <div className="mb-8 bg-amber-50 p-6 rounded-lg shadow-sm border border-amber-100">
                <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
                  <FaPlus className="mr-2 text-xl" /> Add New Item
                </h3>
                <form onSubmit={handleAddMenuItem} className="space-y-6">
                  <div>
                    <label className="block text-gray-700 text-base font-medium" htmlFor="item-name">Item Name</label>
                    <input
                      id="item-name"
                      type="text"
                      value={newItem.name}
                      onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                      required
                      aria-label="Item name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-base font-medium" htmlFor="item-category">Category</label>
                    <select
                      id="item-category"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                    <label className="block text-gray-700 text-base font-medium" htmlFor="item-price">Price (₹)</label>
                    <input
                      id="item-price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                      required
                      aria-label="Item price"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-base font-medium" htmlFor="item-description">Description (Optional)</label>
                    <textarea
                      id="item-description"
                      value={newItem.description}
                      onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                        className="mr-3 h-4 w-4 textocial-amber-600 border-gray-300 rounded focus:ring-amber-400"
                        aria-label="Item available"
                      />
                      <span className="text-gray-700 text-base">Available for Sale</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full px-6 py-3 rounded-lg text-white text-base font-medium flex items-center justify-center hover:bg-amber-600 transition-colors duration-200 shadow-sm"
                    style={{ backgroundColor: '#d97706' }}
                    aria-label="Add new item"
                  >
                    <FaPlus className="mr-2 text-lg" /> Add Item
                  </button>
                </form>
              </div>
              <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
                <FaHamburger className="mr-2 text-xl" /> Menu Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-amber-50 text-gray-700">
                      <th className="p-4 text-base font-medium w-1/4 border-b border-gray-200">Name</th>
                      <th className="p-4 text-base font-medium w-1/4 border-b border-gray-200">Category</th>
                      <th className="p-4 text-base font-medium w-1/6 border-b border-gray-200">Price</th>
                      <th className="p-4 text-base font-medium w-1/6 border-b border-gray-200">Available</th>
                      <th className="p-4 text-base font-medium w-1/6 border-b border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-gray-500 text-base border-b border-gray-200">No menu items found.</td>
                      </tr>
                    ) : (
                      menuItems.map((item, index) => (
                        <tr key={item._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 hover:bg-amber-50 transition-colors duration-200`}>
                          <td className="p-4 text-base text-gray-800">{item.name}</td>
                          <td className="p-4 text-base text-gray-800">{item.category}</td>
                          <td className="p-4 text-base text-gray-800">₹{item.price.toFixed(2)}</td>
                          <td className="p-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={item.isAvailable}
                                onChange={() => handleToggleAvailability(item._id, item.isAvailable)}
                                className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-400"
                                aria-label={`Toggle availability for ${item.name}`}
                              />
                              <span className="ml-2 text-base text-gray-700">{item.isAvailable ? 'Yes' : 'No'}</span>
                            </label>
                          </td>
                          <td className="p-4">
                            <button
                              className="px-4 py-2 rounded-lg text-white text-base hover:bg-red-600 transition-colors duration-200 shadow-sm"
                              style={{ backgroundColor: '#ef4444' }}
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-800">
                <FaChartBar className="mr-3 text-amber-600 text-2xl" /> Sales Reports
              </h2>
              <div className="mb-8 bg-amber-50 p-4 rounded-lg shadow-sm border border-amber-100">
                <h3 className="text-lg font-medium mb-4 text-gray-700">Report Filters</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
                      <DatePicker
                        selected={reportStartDate}
                        onChange={date => setReportStartDate(date)}
                        maxDate={reportEndDate}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select report start date"
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
                      <DatePicker
                        selected={reportEndDate}
                        onChange={date => setReportEndDate(date)}
                        minDate={reportStartDate}
                        maxDate={new Date()}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select report end date"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Status</label>
                      <select
                        value={reportStatusFilter}
                        onChange={e => setReportStatusFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select order status filter"
                      >
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Prepared">Prepared</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Payment Method</label>
                      <select
                        value={reportPaymentFilter}
                        onChange={e => setReportPaymentFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                  <div className="flex items-center gap-3">
                    <button
                      className="px-4 py-1.5 rounded-lg text-gray-700 text-sm hover:bg-gray-100 transition-colors duration-200 shadow-sm border border-gray-200"
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
                      className="px-4 py-1.5 rounded-lg text-white text-sm font-medium flex items-center hover:bg-amber-600 transition-colors duration-200 shadow-sm"
                      style={{ backgroundColor: '#d97706' }}
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                {activeTab}
              </h2>

              {activeTab === 'Paid Bills' && (
                <div className="mb-8 bg-amber-50 p-4 rounded-lg shadow-sm border border-amber-100">
                  <h3 className="text-lg font-medium mb-4 text-gray-700">Date Filter</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
                      <DatePicker
                        selected={startDate}
                        onChange={date => setStartDate(date)}
                        maxDate={endDate}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select start date"
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
                      <DatePicker
                        selected={endDate}
                        onChange={date => setEndDate(date)}
                        minDate={startDate}
                        maxDate={new Date()}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select end date"
                      />
                    </div>
                    <button
                      className="px-4 py-1.5 rounded-lg text-gray-700 text-sm hover:bg-gray-100 transition-colors duration-200 shadow-sm border border-gray-200 mt-6"
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
                <div className="mb-8 bg-amber-50 p-4 rounded-lg shadow-sm border border-amber-100">
                  <h3 className="text-lg font-medium mb-4 text-gray-700">Payment Summary</h3>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(paymentMethodSummary).map(([method, revenue]) => (
                      <div key={method} className="flex items-center">
                        {paymentMethodBadge(method)}
                        <span className="ml-2 text-base text-gray-800">₹{revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <div className="min-h-[400px] max-h-[400px] overflow-y-auto">
                  <table className="min-w-full text-left border-separate" style={{ borderSpacing: '0 4px' }}>
                    <thead className="sticky top-0 bg-amber-50 text-gray-700">
                      <tr>
                        <th className="p-4 text-sm font-semibold text-center w-1/12 border-b border-gray-200">Table</th>
                        <th className="p-4 text-sm font-semibold text-center w-1/12 border-b border-gray-200">Order number</th>
                        <th className="p-4 text-sm font-semibold text-center hidden md:table-cell w-1/12 border-b border-gray-200">Date</th>
                        <th className="p-4 text-sm font-semibold text-center w-3/12 border-b border-gray-200">Items</th>
                        <th className="p-4 text-sm font-semibold text-center w-1/12 border-b border-gray-200">Total</th>
                        <th className="p-4 text-sm font-semibold text-center w-1/12 border-b border-gray-200">Status</th>
                        <th className="p-4 text-sm font-semibold text-center w-2/12 border-b border-gray-200">
                          {activeTab === 'Paid Bills' ? 'Paid by' : 'Payment'}
                        </th>
                        <th className="p-4 text-sm font-semibold text-center min-w-fit border-b border-gray-200">Actions</th>
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
              <div ref={paymentModalRef} className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border border-gray-100">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-xl font-semibold flex items-center text-gray-800">
                    <FaCheck className="mr-3 text-amber-600 text-xl" /> Mark Order as Paid
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-base font-medium" htmlFor="payment-method">Payment Method</label>
                    <select
                      id="payment-method"
                      value={selectedPaymentMethod}
                      onChange={e => setSelectedPaymentMethod(e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end gap-4">
                    <button
                      className="px-4 py-2 rounded-lg text-gray-700 text-base font-medium flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 shadow-sm border border-gray-200"
                      onClick={() => {
                        setShowPaymentModal(null);
                        setSelectedPaymentMethod('');
                      }}
                      aria-label="Cancel"
                    >
                      <FaTimes className="mr-2 text-lg" /> Cancel
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white text-base font-medium flex items-center justify-center hover:bg-green-600 transition-colors duration-200 shadow-sm"
                      style={{ backgroundColor: '#22c55e' }}
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
              <div ref={modalRef} className="bg-white rounded-xl w-full max-w-2xl h-[90vh] flex flex-col shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-200 shrink-0">
                  <h2 className="text-xl font-semibold flex items-center text-gray-800">
                    <FaEdit className="mr-3 text-amber-600 text-xl" /> Edit Order #{editingOrder.orderNumber}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-700 text-base font-medium" htmlFor="edit-table-number">Table Number</label>
                      <input
                        id="edit-table-number"
                        type="number"
                        value={editingOrder.tableNumber}
                        onChange={e => setEditingOrder({ ...editingOrder, tableNumber: parseInt(e.target.value) })}
                        className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        required
                        aria-label="Table number"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-700 mb-2">Items</h3>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="space-y-4">
                          {editingOrder.items.map((item, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              <select
                                value={item.itemId}
                                onChange={e => {
                                  const newItems = [...editingOrder.items];
                                  const selectedItem = menuItems.find(i => i._id === e.target.value);
                                  newItems[index] = {
                                    ...newItems[index],
                                    itemId: e.target.value,
                                    name: selectedItem.name,
                                    price: selectedItem.price
                                  };
                                  setEditingOrder({ ...editingOrder, items: newItems });
                                }}
                                className="w-full sm:w-1/2 border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...editingOrder.items];
                                  newItems[index] = { ...newItems[index], quantity: parseInt(e.target.value) };
                                  setEditingOrder({ ...editingOrder, items: newItems });
                                }}
                                className="w-full sm:w-1/4 border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                                min="1"
                                aria-label={`Quantity for item ${index + 1}`}
                              />
                              <button
                                className="px-4 py-2 rounded-lg text-white hover:bg-red-600 transition-colors duration-200 shadow-sm"
                                style={{ backgroundColor: '#ef4444' }}
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
                        </div>
                      </div>
                      <button
                        className="mt-4 px-4 py-2 rounded-lg text-white text-base font-medium flex items-center hover:bg-amber-600 transition-colors duration-200 shadow-sm"
                        style={{ backgroundColor: '#d97706' }}
                        onClick={() => {
                          setEditingOrder({
                            ...editingOrder,
                            items: [
                              ...editingOrder.items,
                              { itemId: menuItems[0]._id, quantity: 1, name: menuItems[0].name, price: menuItems[0].price }
                            ]
                          });
                        }}
                        disabled={!menuItems.length}
                        aria-label="Add new item to order"
                      >
                        <FaPlus className="mr-2 text-lg" /> Add Item
                      </button>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-base font-medium">Status</label>
                      <select
                        value={editingOrder.status}
                        onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
                        aria-label="Select order status"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Prepared">Prepared</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    {editingOrder.status === 'Completed' && (
                      <div>
                        <label className="block text-gray-700 text-base font-medium" htmlFor="edit-payment-method">Payment Method</label>
                        <select
                          id="edit-payment-method"
                          value={editingOrder.paymentMethod}
                          onChange={e => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                          className="w-full border rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-amber-400 bg-white shadow-sm border-gray-200"
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
                    )}
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 shrink-0">
                  <div className="flex justify-end gap-4">
                    <button
                      className="px-4 py-2 rounded-lg text-gray-700 text-base font-medium flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 shadow-sm border border-gray-200"
                      onClick={() => setEditingOrder(null)}
                      aria-label="Cancel edit"
                    >
                      <FaTimes className="mr-2 text-lg" /> Cancel
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white text-base font-medium flex items-center justify-center hover:bg-amber-600 transition-colors duration-200 shadow-sm"
                      style={{ backgroundColor: '#d97706' }}
                      onClick={handleSaveEdit}
                      aria-label="Save changes"
                    >
                      <FaCheck className="mr-2 text-lg" /> Save
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