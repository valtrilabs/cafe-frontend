import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUtensils, FaRupeeSign, FaShoppingCart, FaMinus, FaPlus, FaTrash } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const tableNumber = new URLSearchParams(location.search).get('table');

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('sessionToken');
      if (!token || !tableNumber || isNaN(tableNumber) || tableNumber < 1 || tableNumber > 6) {
        navigate('/scan-qr', { state: { message: 'Invalid table. Please scan the QR code.' } });
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/sessions/validate/${token}`);
        if (response.data.tableNumber !== parseInt(tableNumber)) {
          localStorage.removeItem('sessionToken');
          navigate('/scan-qr', { state: { message: 'Session mismatch. Please scan the QR code again.' } });
        }
      } catch (err) {
        console.error('Session validation error:', err.response?.data || err.message);
        localStorage.removeItem('sessionToken');
        navigate('/scan-qr', { state: { message: 'Session expired or invalid. Please scan the QR code again.' } });
      }
    };

    const fetchMenu = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu`);
        if (response.data.length === 0) {
          setError('No menu items available.');
        } else {
          setMenuItems(response.data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching menu:', err.response?.data || err.message);
        setError(err.response?.data.message || 'Failed to load menu. Please try again.');
      }
    };

    validateSession();
    fetchMenu();
  }, [tableNumber, navigate]);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item =>
      item._id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items to place an order.');
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders`,
        {
          tableNumber: parseInt(tableNumber),
          items: cart.map(item => ({ itemId: item._id, quantity: item.quantity }))
        },
        { headers: { 'x-session-token': token } }
      );
      navigate(`/summary?order=${response.data._id}`);
    } catch (err) {
      console.error('Error placing order:', err.response?.data || err.message);
      setError(err.response?.data.message || 'Failed to place order.');
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <header className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" style={{ backgroundColor: '#92400e', color: '#ffffff' }}>
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe - Table {tableNumber}
          </h1>
        </div>
      </header>
      <div className="container mx-auto p-4">
        {error && (
          <div className="text-center text-red-600 mb-4">
            <p>{error}</p>
            <button
              className="mt-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {menuItems.map(item => (
            <div key={item._id} className="bg-white rounded-lg shadow-md p-4">
              <img
                src={item.image ? `${process.env.REACT_APP_API_URL}${item.image}` : 'https://source.unsplash.com/100x100/?food'}
                alt={item.name}
                className="w-full h-32 object-cover rounded mb-2"
              />
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-gray-600">{item.category}</p>
              <p className="text-gray-600 flex items-center">
                <FaRupeeSign className="mr-1" />{item.price.toFixed(2)}
              </p>
              <button
                className="mt-2 w-full px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#b45309' }}
                onClick={() => addToCart(item)}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Cart</h2>
            <ul className="space-y-2">
              {cart.map(item => (
                <li key={item._id} className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center mt-1 space-x-1">
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                        onClick={() => updateQuantity(item._id, -1)}
                      >
                        <FaMinus />
                      </button>
                      <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                      <button
                        className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        onClick={() => updateQuantity(item._id, 1)}
                      >
                        <FaPlus />
                      </button>
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    <FaRupeeSign className="inline mr-1" />
                    {(item.quantity * item.price).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg font-bold flex items-center">
              Total: <FaRupeeSign className="ml-1 mr-1" />{totalPrice.toFixed(2)}
            </p>
            <button
              className="mt-4 w-full px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
              onClick={placeOrder}
            >
              <FaShoppingCart className="mr-2" /> Place Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Menu;