import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUtensils } from 'react-icons/fa';

function WaiterOrder() {
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState(null);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu/operator`);
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

  useEffect(() => {
    fetchMenu();
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <header className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" style={{ backgroundColor: '#92400e', color: '#ffffff' }}>
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> Waiter Dashboard
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
              onClick={fetchMenu}
            >
              Retry
            </button>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-4">Menu Items</h2>
        {menuItems.length === 0 && !error ? (
          <p className="text-gray-600">Loading menu...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item._id} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-gray-600">Category: {item.category}</p>
                <p className="text-gray-600">Price: ₹{item.price.toFixed(2)}</p>
                <p className="text-gray-600">Available: {item.isAvailable ? 'Yes' : 'No'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WaiterOrder;