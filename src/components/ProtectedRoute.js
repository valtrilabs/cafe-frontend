import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const correctPassword = 'GSahebCafe2025'; // Hardcoded for simplicity; consider environment variable in production

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-4 text-center">Enter Password</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              placeholder="Password"
              required
            />
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;