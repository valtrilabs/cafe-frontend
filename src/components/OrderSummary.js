import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUtensils, FaRupeeSign, FaEdit, FaShoppingCart } from 'react-icons/fa';

function OrderSummary() {
  const [order, setOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = new URLSearchParams(location.search).get('order');

  useEffect(() => {
    if (!orderId) {
      navigate('/scan-qr', { state: { message: 'Invalid order. Please scan the QR code to place a new order.' } });
      return;
    }

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, {
          headers: { 'x-session-token': token }
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
        setError(null);
      } catch (err) {
        console.error('Error fetching order:', err.response?.data || err.message);
        setError(err.response?.data.message || 'Failed to load order.');
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('sessionToken');
          navigate('/scan-qr', { state: { message: 'Order paid or session expired. Please scan the QR code to place a new order.' } });
        }
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const updateOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items to update the order.');
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}`,
        { items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity })) },
        { headers: { 'x-session-token': token } }
      );
      setOrder({ ...order, items: cart.map(item => ({ itemId: { _id: item.itemId, name: item.name, price: item.price }, quantity: item.quantity })) });
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating order:', err.response?.data || err.message);
      setError(err.response?.data.message || 'Failed to update order.');
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.itemId === item.itemId);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.itemId === item.itemId
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

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

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!order) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Loading order...</p>
      </div>
    );
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
              onClick={() => setError(null)}
            >
              Clear Error
            </button>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-2">Ordered Items</h3>
          <ul className="space-y-2">
            {(isEditing ? cart : order.items).map(item => (
              <li key={item.itemId._id || item.itemId} className="flex items-center">
                <img
                  src={item.image || (item.itemId.image ? `${process.env.REACT_APP_API_URL}${item.itemId.image}` : 'https://source.unsplash.com/100x100/?food')}
                  alt={item.name || item.itemId.name}
                  className="w-12 h-12 object-cover rounded mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name || item.itemId.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} x <FaRupeeSign className="inline mr-1" />
                    {(item.price || item.itemId.price).toFixed(2)}
                  </p>
                  {isEditing && (
                    <div className="flex items-center mt-1 space-x-1">
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                        onClick={() => updateQuantity(item.itemId._id || item.itemId, -1)}
                      >
                        <FaMinus />
                      </button>
                      <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        onClick={() => updateQuantity(item.itemId._id || item.itemId, 1)}
                      >
                        <FaPlus />
                      </button>
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.itemId._id || item.itemId)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold">
                  <FaRupeeSign className="inline mr-1" />
                  {(item.quantity * (item.price || item.itemId.price)).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg font-bold flex items-center">
            Total: <FaRupeeSign className="ml-1 mr-1" />{totalPrice.toFixed(2)}
          </p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          {!isEditing ? (
            <button
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: order.status === 'Paid' ? '#9ca3af' : '#b45309' }}
              onClick={() => setIsEditing(true)}
              disabled={order.status === 'Paid'}
            >
              <FaEdit className="mr-2" /> Edit Order
            </button>
          ) : (
            <>
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#b45309' }}
                onClick={updateOrder}
              >
                <FaShoppingCart className="mr-2" /> Save Changes
              </button>
              <button
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
                style={{ backgroundColor: '#6b7280' }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;