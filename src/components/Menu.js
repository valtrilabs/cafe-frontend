import React, { useState, useEffect } from 'react';
     import axios from 'axios';
     import { useLocation, useNavigate } from 'react-router-dom';
     import { FaShoppingCart, FaUtensils, FaRupeeSign, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';

     function Menu() {
       const [menuItems, setMenuItems] = useState([]);
       const [cart, setCart] = useState([]);
       const [selectedCategory, setSelectedCategory] = useState('All');
       const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
       const [error, setError] = useState(null);
       const [addedItemId, setAddedItemId] = useState(null);
       const [tableNumber, setTableNumber] = useState(null);
       const [sessionToken, setSessionToken] = useState(null);
       const location = useLocation();
       const navigate = useNavigate();

       const fetchMenu = async () => {
         try {
           const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu`, {
             headers: {
               'x-session-token': JSON.stringify({ token: sessionToken, tableNumber })
             }
           });
           setMenuItems(response.data);
           setError(null);
         } catch (err) {
           setError('Failed to load menu. Please try again.');
         }
       };

       const validateSession = async () => {
         const params = new URLSearchParams(location.search);
         const table = params.get('table');
         if (!table || isNaN(table) || table < 1 || table > 6) {
           navigate('/scan-qr', { state: { message: 'Invalid table number. Please scan the QR code again.' } });
           return;
         }
         try {
           const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions`, { tableNumber: Number(table) });
           setTableNumber(Number(table));
           setSessionToken(response.data.token);
           setError(null);
         } catch (err) {
           navigate('/scan-qr', { state: { message: 'Failed to start session. Please scan the QR code again.' } });
         }
       };

       useEffect(() => {
         validateSession().then(() => {
           if (sessionToken && tableNumber) {
             fetchMenu();
           }
         });
       }, [sessionToken, tableNumber]);

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
         if (cart.length === 0) {
           setError('Cart is empty. Add items to place an order.');
           return;
         }
         try {
           const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
             tableNumber,
             items: cart.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
           }, {
             headers: { 'x-session-token': JSON.stringify({ token: sessionToken, tableNumber }) }
           });
           setCart([]);
           setIsMiniCartOpen(false);
           navigate(`/summary?orderId=${response.data._id}&table=${tableNumber}&token=${sessionToken}`, {
             state: { message: 'Your order has been successfully placed! You can view and edit it below.' }
           });
         } catch (err) {
           setError('Failed to place order. Please try again.');
         }
       };

       const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
       const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

       if (!tableNumber || !sessionToken) {
         return null; // Render nothing until session is validated
       }

       return (
         <div className="min-h-screen bg-orange-50 pb-32">
           <header 
             className="sticky top-0 shadow-lg z-50 border-b-2 border-amber-900" 
             style={{ backgroundColor: '#92400e', color: '#ffffff' }}
           >
             <div className="container mx-auto p-2 sm:p-4 flex justify-between items-center">
               <h1 className="text-lg sm:text-2xl font-bold flex items-center">
                 <FaUtensils className="mr-2" style={{ color: '#fcd34d' }} /> GSaheb Cafe - Table {tableNumber}
               </h1>
               <span 
                 className="text-xs sm:text-sm font-medium flex items-center px-2 py-1 rounded-full" 
                 style={{ backgroundColor: '#b45309', color: '#ffffff' }}
               >
                 <FaShoppingCart className="mr-1 sm:mr-2" style={{ color: '#fcd34d' }} /> Cart: {itemCount} item{itemCount !== 1 ? 's' : ''} (<FaRupeeSign className="inline mr-1" />{totalPrice.toFixed(2)})
               </span>
             </div>
           </header>
           {error && (
             <div className="container mx-auto p-2 sm:p-4 text-center text-red-600">
               <p>{error}</p>
               <button
                 className="mt-2 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-white text-sm"
                 style={{ backgroundColor: '#b45309' }}
                 onClick={() => { setError(null); fetchMenu(); }}
               >
                 Retry
               </button>
             </div>
           )}
           <div className="container mx-auto p-2 sm:p-4">
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
                     <FaShoppingCart className="mr-1 sm:mr-2" /> Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})
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
                                 <FaTrash />
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
                         <FaUtensils className="mr-1 sm:mr-2" /> Place Order
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