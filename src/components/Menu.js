import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUtensils, FaRupeeSign, FaCheckCircle } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItemId, setAddedItemId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const tableId = new URLSearchParams(location.search).get('table');
  const sessionFromUrl = new URLSearchParams(location.search).get('session');

  const validateSession = async () => {
    try {
      if (!tableId || isNaN(parseInt(tableId))) {
        setError('Invalid table number');
        navigate(`/qr-prompt?table=${tableId || 'Unknown'}`);
        return false;
      }

      const storedToken = localStorage.getItem(`sessionToken_${tableId}`) || sessionFromUrl;
      if (!storedToken) {
        console.log('No session token found, redirecting to QR prompt');
        navigate(`/qr-prompt?table=${tableId}`);
        return false;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/session/status`, {
        params: { table: tableId, session: storedToken }
      });
      console.log('Session status response:', response.data);
      if (response.data.status === 'active') {
        setSessionToken(storedToken);
        localStorage.setItem(`sessionToken_${tableId}`, storedToken);
        return true;
      } else {
        console.log(`Session status is ${response.data.status}, redirecting to QR prompt`);
        localStorage.removeItem(`sessionToken_${tableId}`);
        navigate(`/qr-prompt?table=${tableId}`);
        return false;
      }
    } catch (err) {
      console.error('Session validation error:', err.response?.data || err.message);
      setError('Failed to validate session. Please scan the QR code again.');
      localStorage.removeItem(`sessionToken_${tableId}`);
      navigate(`/qr-prompt?table=${tableId}`);
      return false;
    }
  };

  const fetchMenu = () => {
    setIsLoading(true);
    axios.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching menu:', err.response?.data || err.message);
        setError('Failed to load menu. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const initialize = async () => {
      const isValid = await validateSession();
      if (isValid) {
        fetchMenu();
      } else {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

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
      setError('Failed to add item to cart.');
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
      setIsLoading(true);
      console.log('Placing order:', { tableId, sessionToken, items: cart });
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
        tableId: parseInt(tableId),
        sessionToken,
        items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
      });
      console.log('Order response:', response.data);
      setOrderPlaced({
        orderNumber: response.data.orderNumber,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        createdAt: new Date()
      });
      setCart([]);
      setIsMiniCartOpen(false);
      localStorage.removeItem(`sessionToken_${tableId}`);
    } catch (err) {
      console.error('Error placing order:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <FaCheckCircle className="text-green-500 text-4xl mb-4 mx-auto" />
          <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your order is being prepared. Please wait 10-15 minutes for fresh food, just for you!
          </p>
          <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
          <p className="text-gray-600 mb-2">Order #{orderPlaced.orderNumber} - Table {tableId}</p>
          <p className="text-gray-600 mb-4">Placed: {orderPlaced.createdAt.toLocaleString()}</p>
          <ul className="text-left mb-4">
            {orderPlaced.items.map((item, index) => (
              <li key={index} className="text-gray-600">
                {item.quantity} x {item.name} (<FaRupeeSign className="inline mr-1" />
                {(item.quantity * item.price).toFixed(2)})
              </li>
            ))}
          </ul>
          <p className="font-bold flex items-center justify-center">
            Total: <FaRupeeSign className="ml-1 mr-1" />{orderPlaced.total.toFixed(2)}
          </p>
          <p className="text-gray-500 mt-4 text-sm">
            To place another order, please scan the QR code again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-32">
      {/* Sticky Header */}
      <header 
        className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" 
        style={{ backgroundColor: '#92400e', color: '#ffffff' }}
      >
        <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe Menu - Table {tableId}
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

      {/* Loading State */}
      {isLoading && (
        <div className="container mx-auto p-2 sm:p-4 text-center text-gray-600">
          <p>Loading menu...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="container mx-auto p-2 sm:p-4 text-center text-red-600">
          <p>{error}</p>
          <button
            className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: '#b45309' }}
            onClick={() => {
              setError(null);
              fetchMenu();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Category Tabs */}
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

          {/* Menu Items */}
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

          {/* Persistent Mini-Cart */}
          {cart.length > 0 && (
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
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.itemId} className="flex items-center justify-between py-2 border-b">
                          <div className="flex items-center">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-md mr-2"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-600 flex items-center">
                                <FaRupeeSign className="mr-1" />{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm"
                              onClick={() => updateQuantity(item.itemId, -1)}
                            >
                              −
                            </button>
                            <span className="text-sm">{item.quantity}</span>
                            <button
                              className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm"
                              onClick={() => updateQuantity(item.itemId, 1)}
                            >
                              +
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                              onClick={() => removeFromCart(item.itemId)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 sm:mt-4 flex justify-between items-center">
                      <p className="text-lg font-bold flex items-center">
                        Total: <FaRupeeSign className="ml-1 mr-1" />{totalPrice.toFixed(2)}
                      </p>
                      <button
                        className="px-4 sm:px-6 py-2 rounded-lg text-white flex items-center text-sm sm:text-base"
                        style={{ backgroundColor: '#b45309' }}
                        onClick={placeOrder}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Placing...' : 'Place Order'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Menu;