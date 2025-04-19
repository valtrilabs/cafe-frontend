import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { FaUtensils, FaPlus, FaMinus, FaShoppingCart, FaRupeeSign, FaClock } from 'react-icons/fa';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tableNumber = queryParams.get('table');

  const [sessionToken, setSessionToken] = useState(localStorage.getItem('sessionToken'));

  useEffect(() => {
    if (!sessionToken) {
      const newToken = Math.random().toString(36).substring(2);
      localStorage.setItem('sessionToken', newToken);
      setSessionToken(newToken);
      console.log('New session token generated:', newToken);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!tableNumber) {
      setError('Please scan a valid QR code.');
      setLoading(false);
      return;
    }

    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber) || parsedTableNumber < 1) {
      setError('Invalid table number. Please scan a valid QR code.');
      setLoading(false);
      return;
    }

    console.log('Fetching data for tableNumber:', parsedTableNumber, 'sessionToken:', sessionToken);

    const fetchMenu = axios.get(`${process.env.REACT_APP_API_URL}/api/menu`)
      .then(res => {
        console.log('Menu items fetched:', res.data);
        setMenuItems(res.data.filter(item => item.isAvailable));
      })
      .catch(err => {
        console.error('Error fetching menu:', err.message);
        setError('Failed to load menu. Please try again.');
      });

    const fetchOrders = axios.get(`${process.env.REACT_APP_API_URL}/api/orders?tableNumber=${parsedTableNumber}`)
      .then(res => {
        console.log('Orders fetched:', res.data);
        setOrders(res.data);
      })
      .catch(err => {
        console.error('Error fetching orders:', err.message);
        setError('Failed to load orders. Please try again.');
      });

    Promise.all([fetchMenu, fetchOrders]).then(() => {
      setLoading(false);
    });
  }, [tableNumber, sessionToken]);

  useEffect(() => {
    if (!tableNumber || !sessionToken) return;

    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber)) return;

    const interval = setInterval(() => {
      axios.get(`${process.env.REACT_APP_API_URL}/api/orders?tableNumber=${parsedTableNumber}`)
        .then(res => {
          console.log('Polled orders:', res.data);
          setOrders(res.data);
        })
        .catch(err => {
          console.error('Error polling orders:', err.message);
        });
    }, 10000);

    return () => clearInterval(interval);
  }, [tableNumber, sessionToken]);

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

    console.log('Placing order with data:', { tableNumber: parsedTableNumber, items });

    axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
      tableNumber: parsedTableNumber,
      items
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
        setError(`Failed to place order: ${err.response ? err.response.data.error : 'Unknown error'} - ${err.response ? err.response.data.details : ''}`);
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

  // Debug rendering
  console.log('Rendering categories:', Object.keys(groupedMenu));

  const hasActiveOrder = orders.length > 0 && orders.some(order => ['Prepared', 'Completed'].includes(order.status));
  console.log('Has active order:', hasActiveOrder, 'Orders:', orders);

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!tableNumber || !sessionToken) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <p className="text-red-600 text-center">Please scan a valid QR code to access the menu.</p>
      </div>
    );
  }

  if (hasActiveOrder) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600 mb-4">
            An order for Table {tableNumber} is already being prepared or completed.
          </p>
          <p className="text-gray-600">
            Please scan the QR code again after the current order is cleared.
          </p>
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

      {/* Menu Items Grouped by Category */}
      {Object.keys(groupedMenu).length > 0 ? (
        <>
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800" style={{ color: '#b45309' }}>
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
          ))}
        </>
      ) : (
        <p className="text-gray-600 text-center">No menu items available.</p>
      )}

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

      {orders.length > 0 && (
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