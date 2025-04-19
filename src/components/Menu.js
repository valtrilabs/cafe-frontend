import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUtensils, FaRupeeSign, FaHistory, FaCheck, FaSpinner } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItemId, setAddedItemId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();
  const tableNumber = new URLSearchParams(location.search).get('table');

  const initializeSession = () => {
    if (!tableNumber || isNaN(tableNumber)) {
      setError('Invalid or missing table number. Please scan a valid QR code.');
      setIsLoading(false);
      return;
    }

    axios.post(`${process.env.REACT_APP_API_URL}/api/orders/session`, { tableNumber: parseInt(tableNumber) })
      .then(res => {
        console.log('Session initialized:', res.data);
        setSessionToken(res.data.token);
        setError(null);
        checkOrderStatus();
      })
      .catch(err => {
        console.error('Error initializing session:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        let errorMsg = 'Failed to initialize session. ';
        if (err.response) {
          if (err.response.status === 404) {
            errorMsg += 'Session endpoint not found. Check backend deployment.';
          } else if (err.response.status === 500) {
            errorMsg += 'Backend server error. Try again later.';
          } else if (err.response.status === 400) {
            errorMsg += 'Invalid request. Check table number.';
          } else {
            errorMsg += `HTTP ${err.response.status}: ${err.response.data?.error || 'Unknown error'}.`;
          }
        } else if (err.request) {
          errorMsg += 'No response from server. Check backend URL or network.';
        } else {
          errorMsg += err.message;
        }
        setError(errorMsg);
      })
      .finally(() => setIsLoading(false));
  };

  const fetchMenu = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data.filter(item => item.isAvailable));
        if (!error) setError(null);
      })
      .catch(err => {
        console.error('Error fetching menu:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        setError('Failed to load menu. Check backend connection or try again.');
      });
  };

  const checkOrderStatus = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders/latest/${tableNumber}`)
      .then(res => {
        if (res.data) {
          console.log('Latest order status:', res.data);
          setOrderStatus(res.data.status);
          setLatestOrder(res.data);
          if (res.data.status === 'Prepared' || res.data.status === 'Completed') {
            setSessionToken(null); // Clear sessionToken to prevent ordering
            setCart([]); // Clear cart
            setIsMiniCartOpen(false); // Hide mini-cart
          }
        }
      })
      .catch(err => {
        console.error('Error checking order status:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        if (err.response?.status !== 404) {
          setError('Failed to check order status.');
        }
      });
  };

  useEffect(() => {
    setIsLoading(true);
    fetchMenu();
    initializeSession();
  }, [tableNumber]);

  const retrySession = () => {
    if (orderStatus === 'Prepared' || orderStatus === 'Completed') {
      setError('Please scan the QR code again to place a new order.');
      return;
    }
    setError(null);
    setCart([]);
    setIsMiniCartOpen(false);
    setIsLoading(true);
    initializeSession();
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
    if (!sessionToken) {
      setError('Cannot add items. Session not initialized. Please scan the QR code.');
      return;
    }
    if (orderStatus === 'Prepared' || orderStatus === 'Completed') {
      setError('Cannot add items. Your previous order is already prepared or completed. Please scan the QR code again.');
      return;
    }
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

  const placeOrder = () => {
    if (!sessionToken || cart.length === 0) {
      setError('Cart is empty or session is invalid. Please scan the QR code.');
      return;
    }
    if (orderStatus === 'Prepared' || orderStatus === 'Completed') {
      setError('Cannot place order. Your previous order is already prepared or completed. Please scan the QR code again.');
      return;
    }
    axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
      sessionToken,
      tableNumber: parseInt(tableNumber),
      items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
    })
      .then(res => {
        console.log('Order placed:', res.data);
        alert('Congratulations, Your Order is placed successfully. Please wait 10-15 minutes until we prepare fresh food, just for you.');
        setCart([]);
        setIsMiniCartOpen(false);
        setOrderStatus('Pending');
        checkOrderStatus();
        setError(null);
        return res.data.orderNumber;
      })
      .catch(err => {
        console.error('Error placing order:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        setError('Failed to place order. Please try again.');
      });
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-orange-50 pb-32">
      {/* Sticky Header */}
      <header 
        className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" 
        style={{ backgroundColor: '#92400e', color: '#ffffff' }}
      >
        <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> 
            Welcome to GSaheb Cafe - Table {tableNumber || 'Unknown'}
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span 
              className="text-xs sm:text-sm font-medium flex items-center px-2 py-1 rounded-full" 
              style={{ backgroundColor: '#b45309', color: '#ffffff' }}
            >
              <FaShoppingCart className="mr-1 sm:mr-2" style={{ color: '#fcd34d' }} /> 
              Cart: {itemCount} item{itemCount !== 1 ? 's' : ''} 
              (<FaRupeeSign className="inline mr-1" />{totalPrice.toFixed(2)})
            </span>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="container mx-auto p-2 sm:p-4 text-center">
          <FaSpinner className="animate-spin text-4xl text-amber-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading menu...</p>
        </div>
      )}

      {/* Error Message */}
      {error && !isLoading && (
        <div className="container mx-auto p-2 sm:p-4 text-center text-red-600">
          <p>{error}</p>
          {(orderStatus !== 'Prepared' && orderStatus !== 'Completed') && (
            <button
              className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#b45309' }}
              onClick={retrySession}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Order Status or Menu */}
      {orderStatus === 'Prepared' || orderStatus === 'Completed' ? (
        <div className="container mx-auto p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
            <p className="text-lg text-gray-700">
              Your order is {orderStatus.toLowerCase()}. Please scan the QR code again to place a new order.
            </p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white flex items-center mx-auto"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => setShowSummary(true)}
            >
              <FaHistory className="mr-2" /> View Order Summary
            </button>
          </div>
        </div>
      ) : (
        !isLoading && (
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
                            item.isAvailable && sessionToken
                              ? 'hover:bg-green-600 focus:ring-2 focus:ring-green-400'
                              : 'bg-red-500 hover:bg-red-600 cursor-not-allowed'
                          } ${addedItemId === item._id ? 'animate-pulse' : ''}`}
                          style={{ backgroundColor: item.isAvailable && sessionToken ? '#16a34a' : '#ef4444' }}
                          onClick={() => addToCart(item)}
                          disabled={!item.isAvailable || !sessionToken}
                        >
                          {item.isAvailable && sessionToken ? (
                            <>
                              <FaShoppingCart className="mr-1 sm:mr-2" /> 
                              {addedItemId === item._id ? 'Added!' : 'Add to Cart'}
                            </>
                          ) : (
                            sessionToken ? 'Sold Out' : 'Session Error'
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )
      )}

      {/* Persistent Mini-Cart */}
      {cart.length > 0 || isMiniCartOpen ? (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-30 transition-all duration-300 ${
            isMiniCartOpen ? 'h-80 sm:h-64' : 'h-12'
          }`}
        >
          <div className="container mx-auto p-2 sm:p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <FaShoppingCart className="mr-1 sm:mr-2" /> 
                Your Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})
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
                    style={{ backgroundColor: cart.length === 0 || !sessionToken ? '#9ca3af' : '#b45309' }}
                    onClick={placeOrder}
                    disabled={cart.length === 0 || !sessionToken}
                  >
                    <FaUtensils className="mr-1 sm:mr-2" /> Order Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Order Summary Modal */}
      {showSummary && latestOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center">
              <FaHistory className="mr-2" style={{ color: '#b45309' }} /> Order Summary
            </h2>
            <p className="text-sm text-gray-600">
              Order #{latestOrder.orderNumber} - {latestOrder.status}
            </p>
            <ul className="mt-2 space-y-2">
              {latestOrder.items.map((item, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (
                  <FaRupeeSign className="inline mr-1" />
                  {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                </li>
              ))}
            </ul>
            <p className="mt-2 font-bold flex items-center">
              Total: <FaRupeeSign className="ml-1 mr-1" />
              {latestOrder.items
                .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                .toFixed(2)}
            </p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white w-full"
              style={{ backgroundColor: '#ef4444' }}
              onClick={() => setShowSummary(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;