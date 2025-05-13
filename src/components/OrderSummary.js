import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUtensils, FaRupeeSign, FaEdit } from 'react-icons/fa';

function OrderSummary() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cart, setCart] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const validateOrder = async () => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    const tableNumber = params.get('table');
    const token = params.get('token');
    if (!orderId || !tableNumber || !token) {
      navigate('/scan-qr', { state: { message: 'Invalid order. Please scan the QR code again.' } });
      return;
    }
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/validate`, {
        params: { orderId, tableNumber, token }
      });
      if (!response.data.valid) {
        navigate('/scan-qr', { state: { message: 'Order is no longer active. Please scan the QR code to start a new order.' } });
        return;
      }
      setOrder(response.data.order);
      setCart(response.data.order.items.map(item => ({
        itemId: item.itemId._id,
        name: item.itemId.name,
        price: item.itemId.price,
        quantity: item.quantity,
        image: item.itemId.image
          ? `${process.env.REACT_APP_API_URL}${item.itemId.image}`
          : 'https://source.unsplash.com/100x100/?food',
        category: item.itemId.category || 'Uncategorized'
      })));
      setError(null);
    } catch (err) {
      setError('Failed to load order. Please try again.');
      navigate('/scan-qr', { state: { message: 'Failed to load order. Please scan the QR code again.' } });
    }
  };

  useEffect(() => {
    validateOrder();
    const interval = setInterval(validateOrder, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(cartItem =>
      cartItem.itemId === itemId
        ? { ...cartItem, quantity: Math.max(1, cartItem.quantity + delta) }
        : cartItem
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(cartItem => cartItem.itemId !== itemId));
  };

  const saveOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items to update the order.');
      return;
    }
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${order._id}`, {
        items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
      });
      setOrder(response.data);
      setCart(response.data.items.map(item => ({
        itemId: item.itemId._id,
        name: item.itemId.name,
        price: item.itemId.price,
        quantity: item.quantity,
        image: item.itemId.image
          ? `${process.env.REACT_APP_API_URL}${item.itemId.image}`
          : 'https://source.unsplash.com/100x100/?food',
        category: item.itemId.category || 'Uncategorized'
      })));
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Failed to update order. Please try again.');
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!order) {
    return null; // Render nothing until order is validated
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <header className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" style={{ backgroundColor: '#92400e', color: '#ffffff' }}>
        <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe - Order Summary
          </h1>
        </div>
      </header>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Order #{order.orderNumber}</h2>
        <p className="text-gray-600 mb-4">Table {order.tableNumber} | Status: {order.status}</p>
        {error && (
          <div className="text-center text-red-600 mb-4">
            <p>{error}</p>
            <button
              className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => { setError(null); validateOrder(); }}
            >
              Retry
            </button>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Ordered Items</h3>
            {!isEditing && (
              <button
                className="px-3 py-1 rounded-lg text-white flex items-center"
                style={{ backgroundColor: '#b45309' }}
                onClick={() => setIsEditing(true)}
              >
                <FaEdit className="mr-2" /> Edit Order
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {cart.map(item => (
              <li key={item.itemId} className="flex items-center py-2 border-b">
                <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  {isEditing ? (
                    <div className="flex items-center mt-1 space-x-1">
                      <button
                        className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded-l hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 text-xs sm:text-sm"
                        onClick={() => updateQuantity(item.itemId, -1)}
                      >
                        <FaMinus />
                      </button>
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-xs sm:text-sm">{item.quantity}</span>
                      <button
                        className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded-r hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 text-xs sm:text-sm"
                        onClick={() => updateQuantity(item.itemId, 1)}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">{item.quantity} x <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold"><FaRupeeSign className="inline mr-1" />{(item.quantity * item.price).toFixed(2)}</p>
                  {isEditing && (
                    <button
                      className="text-red-500 hover:text-red-700 text-xs focus:outline-none"
                      onClick={() => removeFromCart(item.itemId)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg font-bold flex items-center">
            Total: <FaRupeeSign className="ml-1 mr-1" />{totalPrice.toFixed(2)}
          </p>
          {isEditing && (
            <div className="mt-4 flex space-x-4">
              <button
                className="px-4 py-2 rounded-lg text-white flex items-center"
                style={{ backgroundColor: '#16a34a' }}
                onClick={saveOrder}
              >
                <FaUtensils className="mr-2" /> Save Changes
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white flex items-center"
                style={{ backgroundColor: '#ef4444' }}
                onClick={() => {
                  setIsEditing(false);
                  setCart(order.items.map(item => ({
                    itemId: item.itemId._id,
                    name: item.itemId.name,
                    price: item.itemId.price,
                    quantity: item.quantity,
                    image: item.itemId.image
                      ? `${process.env.REACT_APP_API_URL}${item.itemId.image}`
                      : 'https://source.unsplash.com/100x100/?food',
                    category: item.itemId.category || 'Uncategorized'
                  })));
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;