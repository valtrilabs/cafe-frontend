import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUtensils, FaPlus, FaMinus, FaShoppingCart, FaRupeeSign, FaClock } from 'react-icons/fa';

// Configure axios with a timeout
const axiosInstance = axios.create({
  timeout: 10000, // 10-second timeout
});

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [pageState, setPageState] = useState('loading');

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tableNumber = queryParams.get('table');

  // Validate session on page load
  useEffect(() => {
    if (!tableNumber) {
      setError('Please scan a valid QR code to access the menu.');
      setPageState('locked');
      setLoading(false);
      setSessionLoading(false);
      navigate('/');
      return;
    }

    // Clear localStorage for fresh scan
    localStorage.removeItem('sessionToken');
    setSessionToken(null);
    setSessionLoading(true);

    // Generate new sessionToken with retry
    const createSession = async (retry = true) => {
      try {
        const res = await axiosInstance.post(`${process.env.REACT_APP_API_URL}/api/sessions`, { tableNumber });
        const newToken = res.data.sessionToken;
        localStorage.setItem('sessionToken', newToken);
        setSessionToken(newToken);
        setPageState('menu');
        console.log('New session token generated:', newToken);
      } catch (err) {
        console.error('Error generating session token:', err.response ? err.response.data : err.message);
        if (retry && err.response?.data?.error === 'Session token conflict. Please try again.') {
          console.log('Retrying session creation...');
          return createSession(false);
        }
        setError('Failed to create session. Please try scanning the QR code again or contact support.');
        setPageState('locked');
        setLoading(false);
        setSessionLoading(false);
      }
    };

    createSession();
  }, [tableNumber, navigate]);

  // Fetch menu and orders
  useEffect(() => {
    if (!tableNumber || !sessionToken || sessionLoading) return;

    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber) || parsedTableNumber < 1) {
      setError('Invalid table number. Please scan a valid QR code.');
      setPageState('locked');
      setLoading(false);
      navigate('/');
      return;
    }

    console.log('Fetching data for tableNumber:', parsedTableNumber, 'sessionToken:', sessionToken);

    const fetchMenu = axiosInstance.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data.filter(item => item.isAvailable));
      })
      .catch(err => {
        console.error('Error fetching menu:', err.message);
        setError('Failed to load menu. Please try again.');
      });

    const fetchOrders = axiosInstance.get(`${process.env.REACT_APP_API_URL}/api/orders?tableNumber=${parsedTableNumber}&sessionToken=${sessionToken}`)
      .then(res => {
        console.log('Orders fetched:', res.data);
        setOrders(res.data);
        const hasPreparedOrder = res.data.some(order => ['Prepared', 'Completed'].includes(order.status));
        if (hasPreparedOrder) {
          console.log('Invalidating session due to Prepared/Completed order');
          localStorage.removeItem('sessionToken');
          setSessionToken(null);
          setError('Your previous order is prepared or completed. Please scan the QR code again to place a new order.');
          setPageState('locked');
          navigate('/', { replace: true });
        }
      })
      .catch(err => {
        console.error('Error fetching orders:', err.message);
        setError('Failed to load orders. Please try again.');
      });

    Promise.all([fetchMenu, fetchOrders])
      .then(() => {
        setLoading(false);
      })
      .catch(err => {
        console.error('Error in Promise.all:', err.message);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      });
  }, [tableNumber, sessionToken, sessionLoading, navigate]);

  // Poll for order status
  useEffect(() => {
    if (!tableNumber || !sessionToken || sessionLoading) return;

    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber)) return;

    const interval = setInterval(() => {
      axiosInstance.get(`${process.env.REACT_APP_API_URL}/api/orders?tableNumber=${parsedTableNumber}&sessionToken=${sessionToken}`)
        .then(res => {
          console.log('Polled orders:', res.data);
          setOrders(res.data);
          const hasPreparedOrder = res.data.some(order => ['Prepared', 'Completed'].includes(order.status));
          if (hasPreparedOrder) {
            console.log('Invalidating session due to Prepared/Completed order');
            localStorage.removeItem('sessionToken');
            setSessionToken(null);
            setError('Your previous order is prepared or completed. Please scan the QR code again to place a new order.');
            setPageState('locked');
            navigate('/', { replace: true });
          }
        })
        .catch(err => {
          console.error('Error polling orders:', err.message);
        });
    }, 5000);

    return () => clearInterval(interval);
  }, [tableNumber, sessionToken, sessionLoading, navigate]);

  const addToCart = (itemId) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const placeOrder = () => {
    if (Object.keys(cart).length === 0) {
      setError('Your cart is empty.');
      return;
    }

    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber)) {
      setError('Invalid table number.');
      return;
    }

    const items = Object.entries(cart).map(([itemId, quantity]) => ({
      itemId,
      quantity
    }));

    console.log('Placing order with data:', { tableNumber: parsedTableNumber, items, sessionToken });

    axiosInstance.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
      tableNumber: parsedTableNumber,
      items,
      sessionToken
    })
      .then(res => {
        console.log('Order placed successfully:', res.data);
        setOrderSuccess(`Order #${res.data.orderNumber} placed successfully!`);
        setCart({});
        setError(null);
        setOrders(prev => [res.data, ...prev]);
      })
      .catch(err => {
        console.error('Error placing order:', err.response ? err.response.data : err.message);
        const errorMessage = err.response && err.response.data.error
          ? `Failed to place order: ${err.response.data.error}`
          : 'Failed to place order: Unknown error';
        setError(errorMessage);
      });
  };

  // Group menu items by category
  const groupedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  console.log('Grouped menu:', groupedMenu);

  console.log('Rendering categories:', Object.keys(groupedMenu));

  const pendingOrders = orders.filter(order => order.status === 'Pending');

  if (pageState === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (pageState === 'locked') {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Please scan a valid QR code to access the menu.'}</p>
          <p className="text-gray-600">Please scan the QR code again to place a new order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center justify-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> GSaheb Cafe Menu - Table {tableNumber}
      </h1>

      {orderSuccess && (
        <p className="text-green-600 text-center mb-4">{orderSuccess}</p>
      )}
      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      {/* Pending Order Summary */}
      {pendingOrders.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaShoppingCart className="mr-2" style={{ color: '#b45309' }} /> Your Pending Order
          </h2>
          {pendingOrders.map(order => (
            <div key={order._id}>
              <p className="text-gray-600 text-sm">Order #{order.orderNumber} - Status: {order.status}</p>
              <ul className="mt-2 space-y-2">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between text-gray-600 text-sm">
                    <span>{item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'}</span>
                    <span className="flex items-center">
                      <FaRupeeSign className="mr-1" />
                      {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-bold text-gray-800 flex items-center">
                Total: <FaRupeeSign className="ml-1 mr-1" />
                {order.items.reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Menu Items Grouped by Category */}
      <div className="menu-container">
        {Object.keys(groupedMenu).length > 0 ? (
          Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="category-section mb-8">
              <h2
                className="text-2xl font-semibold mb-4"
                style={{
                  color: '#b45309',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  display: 'block',
                  marginBottom: '1rem',
                  backgroundColor: '#fff7ed',
                  padding: '0.5rem'
                }}
              >
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {items.map(item => (
                  <div key={item._id} className="bg-white rounded-lg shadow-md p-4 flex flex-col">
                    {item.image && (
                      <img
                        src={`${process.env.REACT_APP_API_URL}${item.image}`}
                        alt={item.name}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <h3 className="text-lg sm:text-xl font-semibold">{item.name}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                    <p className="text-gray-800 font-bold flex items-center mt-2">
                      <FaRupeeSign className="mr-1" />{item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center mt-4">
                      <button
                        className="px-2 py-1 rounded-lg"
                        style={{ backgroundColor: '#b45309', color: '#ffffff' }}
                        onClick={() => removeFromCart(item._id)}
                        disabled={!cart[item._id]}
                      >
                        <FaMinus />
                      </button>
                      <span className="mx-2">{cart[item._id] || 0}</span>
                      <button
                        className="px-2 py-1 rounded-lg"
                        style={{ backgroundColor: '#b45309', color: '#ffffff' }}
                        onClick={() => addToCart(item._id)}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-center">No menu items available.</p>
        )}
      </div>

      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center">
            <FaShoppingCart className="mr-2" style={{ color: '#b45309' }} /> Your Cart
          </h2>
          <ul className="mt-2 space-y-2">
            {Object.entries(cart).map(([itemId, quantity]) => {
              const item = menuItems.find(i => i._id === itemId);
              return item ? (
                <li key={itemId} className="flex justify-between text-gray-600 text-sm">
                  <span>{quantity} x {item.name}</span>
                  <span className="flex items-center">
                    <FaRupeeSign className="mr-1" />
                    {(quantity * item.price).toFixed(2)}
                  </span>
                </li>
              ) : null;
            })}
          </ul>
          <p className="mt-2 font-bold text-gray-800 flex items-center">
            Total: <FaRupeeSign className="ml-1 mr-1" />
            {Object.entries(cart)
              .reduce((sum, [itemId, quantity]) => {
                const item = menuItems.find(i => i._id === itemId);
                return sum + (item ? quantity * item.price : 0);
              }, 0)
              .toFixed(2)}
          </p>
          <button
            className="w-full mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#b45309' }}
            onClick={placeOrder}
          >
            Place Order
          </button>
        </div>
      )}

      {orders.length > 0 && pendingOrders.length === 0 && (
        <div className="mt-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <FaClock className="mr-2" style={{ color: '#b45309' }} /> Your Orders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                <p className="text-gray-600 text-sm">Table {order.tableNumber}</p>
                <p
                  className={`text-sm font-medium ${
                    order.status === 'Pending'
                      ? 'text-red-600'
                      : order.status === 'Prepared'
                      ? 'text-green-600'
                      : 'text-blue-600'
                  }`}
                >
                  Status: {order.status}
                </p>
                <ul className="mt-2 space-y-1">
                  {order.items.map((item, index) => (
                    <li key={index} className="text-gray-600 text-sm">
                      {item.quantity} x {item.itemId ? item.itemId.name : '[Deleted Item]'} (
                      <FaRupeeSign className="inline mr-1" />
                      {(item.quantity * (item.itemId ? item.itemId.price : 0)).toFixed(2)})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-gray-800 flex items-center">
                  Total: <FaRupeeSign className="ml-1 mr-1" />
                  {order.items
                    .reduce((sum, item) => sum + (item.itemId ? item.quantity * item.itemId.price : 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;