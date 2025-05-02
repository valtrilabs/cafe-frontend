import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUtensils, FaRupeeSign } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItemId, setAddedItemId] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tableNumber = queryParams.get('table') || 'Unknown';
  const token = queryParams.get('token');

  const validateSession = async (sessionToken) => {
    try {
      console.log(`Validating session with token: ${sessionToken}`);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/sessions/validate`, {
        params: { token: sessionToken }
      });
      console.log(`Session validated for table ${response.data.tableNumber}`);
      setSessionValid(true);
      setSessionMessage('');
      return response.data;
    } catch (err) {
      console.error('Session validation error:', err.response?.data || err.message);
      setSessionValid(false);
      setSessionMessage(err.response?.data?.error || 'Invalid session. Please scan the QR code again.');
      navigate('/scan-qr', { state: { message: err.response?.data?.error } });
      return null;
    }
  };

  const fetchMenu = async (sessionToken) => {
    try {
      console.log(`Fetching menu with token: ${sessionToken}`);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu`, {
        headers: { 'x-session-token': sessionToken }
      });
      console.log('Menu items fetched:', response.data);
      setMenuItems(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu:', err.response?.data || err.message);
      setError('Failed to load menu. Please try again.');
    }
  };

  const createNewSession = async (tableNum, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Creating new session for table: ${tableNum}`);
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions`, {
          tableNumber: Number(tableNum)
        });
        console.log(`New session created: ${response.data.token}`);
        return response.data.token;
      } catch (err) {
        console.error(`Attempt ${attempt}: Error creating session:`, err.response?.data || err.message);
        if (attempt === retries) {
          setSessionValid(false);
          setSessionMessage('Failed to create session after retries. Please scan the QR code.');
          navigate('/scan-qr', { state: { message: 'Failed to create session. Please scan the QR code.' } });
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      console.log(`Initializing session. Table: ${tableNumber}, Token: ${token}`);
      const tableNum = Number(tableNumber);
      if (isNaN(tableNum) || tableNum < 1) {
        console.error('Invalid table number:', tableNumber);
        setSessionValid(false);
        setSessionMessage('Invalid table number. Please scan the QR code.');
        navigate('/scan-qr', { state: { message: 'Invalid table number. Please scan the QR code.' } });
        return;
      }

      let sessionToken = token;
      if (!token) {
        sessionToken = await createNewSession(tableNum);
        if (sessionToken) {
          console.log(`Redirecting to /order?table=${tableNum}&token=${sessionToken}`);
          navigate(`/order?table=${tableNum}&token=${sessionToken}`, { replace: true });
        }
        return;
      }

      const result = await validateSession(sessionToken);
      if (result) {
        fetchMenu(sessionToken);
      }
    };

    initializeSession();

    const interval = setInterval(async () => {
      if (token) {
        const result = await validateSession(token);
        if (!result) {
          setSessionValid(false);
          setSessionMessage('Session expired or order prepared. Please scan QR code again.');
          navigate('/scan-qr', { state: { message: 'Session expired or order prepared. Please scan QR code again.' } });
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [tableNumber, token, navigate]);

  const startNewOrder = () => {
    navigate('/scan-qr');
  };

  const categories = [
    { name: 'All', icon: '🌟' },
    ...[...new Set(menuItems.map(item => item.category).filter(Boolean))]
      .map(category => ({
        name: category,
        icon: {
          'Main Course': '🍔',
          'Drinks': '🥤',
          'Street Food': '🌮',
          'Salads': '🥗',
          'Desserts': '🍰'
        }[category] || '🍽️'
      }))
  ];

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    try {
      console.log('Adding to cart:', item);
      const existingItem = cart.find(cartItem => cartItem.itemId === item._id);
      const placeholderImages = {
        'Main Course': 'https://source.unsplash.com/100x100/?sandwich',
        'Drinks': 'https://source.unsplash.com/100x100/?smoothie',
        'Street Food': 'https://source.unsplash.com/100x100/?streetfood',
        'Salads': 'https://source.unsplash.com/100x100/?salad',
        'Desserts': 'https://source.unsplash.com/100x100/?dessert'
      };
      const itemCategory = item.category || 'Uncategorized';
      const itemImage = item.image
        ? `${process.env.REACT_APP_API_URL}${item.image}`
        : placeholderImages[itemCategory] || 'https://source.unsplash.com/100x100/?food';

      if (existingItem) {
        setCart(cart.map(cartItem =>
          cartItem.itemId === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      } else {
        setCart([...cart, {
          itemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: itemImage,
          category: itemCategory
        }]);
      }
      setIsMiniCartOpen(true);
      setAddedItemId(item._id);
      setTimeout(() => setAddedItemId(null), 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
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

  const placeOrder = async () => {
    try {
      console.log('Placing order for table:', tableNumber);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
        tableNumber: parseInt(tableNumber),
        items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
        token
      }, {
        headers: { 'x-session-token': token }
      });
      console.log('Order placed:', response.data);
      setOrderSummary({
        orderNumber: response.data.orderNumber,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      });
      setCart([]);
      setIsMiniCartOpen(false);
    } catch (err) {
      console.error('Error placing order:', err.response?.data || err.message);
      setError('Failed to place order. Please try again.');
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!sessionValid) {
    return null; // Redirect handled by useEffect
  }

  if (orderSummary) {
    return (
      <div className="min-h-screen bg-orange-50 p-4">
        <header className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" style={{ backgroundColor: '#92400e', color: '#ffffff' }}>
          <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center">
              <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe - Table {tableNumber}
            </h1>
          </div>
        </header>
        <div className="container mx-auto p-4">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
          <p className="text-gray-600 mb-4">Your order #{orderSummary.orderNumber} is getting prepared. Please wait 10-15 minutes.</p>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-2">Ordered Items</h3>
            <ul className="space-y-2">
              {orderSummary.items.map(item => (
                <li key={item.itemId} className="flex items-center">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.quantity} x <FaRupeeSign className="inline mr-1" />{item.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-semibold"><FaRupeeSign className="inline mr-1" />{(item.quantity * item.price).toFixed(2)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg font-bold flex items-center">
              Total: <FaRupeeSign className="ml-1 mr-1" />{orderSummary.total.toFixed(2)}
            </p>
          </div>
          <div className="mt-4">
            <button
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: '#b45309' }}
              onClick={startNewOrder}
            >
              <FaUtensils className="mr-2" /> Start New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-32">
      <header 
        className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" 
        style={{ backgroundColor: '#92400e', color: '#ffffff' }}
      >
        <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe Menu - Table {tableNumber}
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span 
              className="text-xs sm:text-sm font-medium flex items-center px-2 py-1 rounded-full" 
              style={{ backgroundColor: '#b45309', color: '#ffffff' }}
            >
              <FaShoppingCart className="mr-1 sm:mr-2" style={{ color: '#fcd34d' }} /> Cart: {itemCount} item{itemCount !== 1 ? 's' : ''} (<FaRupeeSign className="inline mr-1" />{totalPrice.toFixed(2)})
            </span>
          </div>
        </div>
      </header>
      {error && (
        <div className="container mx-auto p-2 sm:p-4 text-center text-red-600">
          <p>{error}</p>
          <button
            className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: '#b45309' }}
            onClick={() => fetchMenu(token)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="container mx-auto p-2 sm:p-4">
        {categories.length === 1 ? (
          <p className="text-center text-gray-600 text-sm">No categories available.</p>
        ) : (
          <div className="flex overflow-x-auto space-x-1 sm:space-x-2 pb-2">
            {categories.map(category => (
              <button
                key={category.name}
                className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category.name
                    ? 'shadow-md hover:bg-amber-700'
                    : 'hover:bg-amber-300'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.name ? '#b45309' : '#fed7aa',
                  color: selectedCategory === category.name ? '#ffffff' : '#1f2937'
                }}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="mr-1 sm:mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="container mx-auto p-2 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {filteredItems.length === 0 ? (
            <p className="text-center col-span-full text-gray-600 text-sm">
              No items available.
            </p>
          ) : (
            filteredItems.map(item => (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow-md p-2 flex flex-col hover:scale-105 hover:shadow-xl transition-transform duration-200"
              >
                <img
                  src={
                    item.image
                      ? `${process.env.REACT_APP_API_URL}${item.image}`
                      : 'https://source.unsplash.com/100x100/?food'
                  }
                  alt={item.name}
                  className="w-full h-20 object-cover rounded-md mb-2"
                />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h2>
                  <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                  <p className="text-gray-700 font-bold mt-1 sm:mt-2 flex items-center text-xs sm:text-sm">
                    <FaRupeeSign className="mr-1" />{item.price.toFixed(2)}
                  </p>
                  <button
                    className={`mt-2 sm:mt-3 w-full text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors flex items-center justify-center text-xs sm:text-sm ${
                      item.isAvailable
                        ? 'hover:bg-green-600 focus:ring-2 focus:ring-green-400'
                        : 'bg-red-500 hover:bg-red-600 cursor-not-allowed'
                    } ${addedItemId === item._id ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: item.isAvailable ? '#16a34a' : '#ef4444' }}
                    onClick={() => addToCart(item)}
                    disabled={!item.isAvailable}
                  >
                    {item.isAvailable ? (
                      <>
                        <FaShoppingCart className="mr-1 sm:mr-2" /> 
                        {addedItemId === item._id ? 'Added!' : 'Add to Cart'}
                      </>
                    ) : (
                      'Sold Out'
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {cart.length > 0 || isMiniCartOpen ? (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-30 transition-all duration-300 ${
            isMiniCartOpen ? 'h-80 sm:h-64' : 'h-12'
          }`}
        >
          <div className="container mx-auto p-2 sm:p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <FaShoppingCart className="mr-1 sm:mr-2" /> Your Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})
              </h2>
              <button
                className="text-gray-600 hover:text-gray-800 focus:outline-none text-sm sm:text-base"
                onClick={() => setIsMiniCartOpen(!isMiniCartOpen)}
              >
                {isMiniCartOpen ? 'Hide Cart ▼' : 'See Cart ▲'}
              </button>
            </div>
            {isMiniCartOpen && (
              <div className="mt-2 sm:mt-4">
                {cart.length === 0 ? (
                  <p className="text-gray-600 text-sm">Your cart is empty.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {cart.map(item => (
                      <div
                        key={item.itemId}
                        className="flex items-center py-1 sm:py-2 border-b"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 sm:w-12 h-10 sm:h-12 object-cover rounded mr-2 sm:mr-3"
                        />
                        <div className="flex-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-800">{item.name}</span>
                          <div className="flex items-center mt-1 space-x-1">
                            <button
                              className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded-l hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 text-xs sm:text-sm"
                              onClick={() => updateQuantity(item.itemId, -1)}
                            >
                              -
                            </button>
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-xs sm:text-sm">{item.quantity}</span>
                            <button
                              className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded-r hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 text-xs sm:text-sm"
                              onClick={() => updateQuantity(item.itemId, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm text-gray-700 flex items-center">
                            <FaRupeeSign className="mr-1" />
                            {(item.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            className="text-red-500 hover:text-red-700 text-xs focus:outline-none"
                            onClick={() => removeFromCart(item.itemId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
                  <p className="text-base sm:text-lg font-bold text-gray-800 flex items-center">
                    Total: <FaRupeeSign className="ml-1 mr-1" />{totalPrice.toFixed(2)}
                  </p>
                  <button
                    className="w-full sm:w-auto px-4 sm:px-6 py-1 sm:py-2 rounded-lg text-white transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm"
                    style={{ backgroundColor: cart.length === 0 ? '#9ca3af' : '#b45309' }}
                    onClick={placeOrder}
                    disabled={cart.length === 0}
                  >
                    <FaUtensils className="mr-1 sm:mr-2" /> Order Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Menu;