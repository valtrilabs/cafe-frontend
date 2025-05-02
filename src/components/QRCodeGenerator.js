import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const [tokens, setTokens] = useState({});
  const [error, setError] = useState(null);

  const fetchTokens = async () => {
    try {
      console.log('Fetching latest tokens from: https://cafe-backend-ay2n.onrender.com');
      const promises = [1, 2, 3, 4, 5, 6].map(table =>
        axios.get(`https://cafe-backend-ay2n.onrender.com/api/sessions/latest/${table}`)
      );
      const responses = await Promise.all(promises);
      const newTokens = responses.reduce((acc, res, index) => {
        acc[index + 1] = res.data.token;
        console.log(`Table ${index + 1} token: ${res.data.token}`);
        return acc;
      }, {});
      setTokens(newTokens);
      setError(null);
    } catch (error) {
      console.error('Error fetching tokens:', error.response?.data || error.message);
      setError('Failed to generate QR codes. Please try again.');
    }
  };

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>QR Codes for Tables</h2>
      <button onClick={fetchTokens}>Refresh QR Codes</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {Object.entries(tokens).map(([table, token]) => (
          <div key={table} style={{ margin: '20px' }}>
            <h3>Table {table}</h3>
            <QRCodeCanvas value={`https://cafe-frontend-pi.vercel.app/order?table=${table}&token=${token}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;