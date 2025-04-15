import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUtensils, FaRupeeSign } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItemId, setAddedItemId] = useState(null);

  const location = useLocation();
  const tableNumber = new URLSearchParams(location.search).get('table') || 'Unknown';

  const fetchMenu = () => {
    // axios.get('http://localhost:5000/api/menu')
    // Render Testing
    axios.get('https://cafe-backend-ay2n.onrender.com/api/menu')
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching menu:', err);
        setError('Failed to load menu. Please try again.');
      });
  };

  useEffect(() => {
    fetchMenu();
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
        ? `https://cafe-backend-ay2n.onrender.com/${item.image}`
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

  const placeOrder = () => {
    axios.post('https://cafe-backend-ay2n.onrender.com/api/orders', {
      tableNumber: parseInt(tableNumber),
      items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
    })
      .then(res => {
        alert('Congratulations, Your Order is placed successfully. Please wait 10-15 minutes until we prepare fresh food, just for you.');
        setCart([]);
        setIsMiniCartOpen(false);
        return res.data.orderNumber;
      })
      .catch(err => {
        console.error('Error placing order:', err);
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

      {/* Error Message */}
      {error && (
        <div className="container mx-auto p-2 sm:p-4 text-center text-red-600">
          <p>{error}</p>
          <button
            className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: '#b45309' }}
            onClick={fetchMenu}
          >
            Retry
          </button>
        </div>
      )}

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
                      ? `https://cafe-backend-ay2n.onrender.com/${item.image}`
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