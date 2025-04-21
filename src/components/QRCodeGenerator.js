import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const [tokens, setTokens] = useState({});
  const [error, setError] = useState(null);
  const [activeTables, setActiveTables] = useState([]);

  const fetchActiveTables = async () => {
    try {
      console.log('Fetching active tables from: https://cafe-backend-ay2n.onrender.com');
      const response = await axios.get('https://cafe-backend-ay2n.onrender.com/api/sessions/active-tables');
      console.log(`Active tables: ${response.data.activeTables}`);
      return response.data.activeTables;
    } catch (error) {
      console.error('Error fetching active tables:', error.response?.data || error.message);
      return [];
    }
  };

  const fetchTokens = async () => {
    try {
      console.log('Fetching latest tokens from: https://cafe-backend-ay2n.onrender.com');
      const tablesToFetch = activeTables.length > 0 ? activeTables : Array.from({ length: 30 }, (_, i) => i + 1);
      const promises = tablesToFetch.map(table =>
        axios.get(`https://cafe-backend-ay2n.onrender.com/api/sessions/latest/${table}`)
      );
      const responses = await Promise.all(promises);
      const newTokens = responses.reduce((acc, res, index) => {
        const table = tablesToFetch[index];
        acc[table] = res.data.token;
        console.log(`Table ${table} token: ${res.data.token}`);
        return acc;
      }, {});
      setTokens(prevTokens => ({ ...prevTokens, ...newTokens }));
      setError(null);
    } catch (error) {
      console.error('Error fetching tokens:', error.response?.data || error.message);
      setError('Failed to generate QR codes. Please try again.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const tables = await fetchActiveTables();
      setActiveTables(tables);
      await fetchTokens();
    };
    initialize();
    const interval = setInterval(async () => {
      const tables = await fetchActiveTables();
      setActiveTables(tables);
      await fetchTokens();
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>QR Codes for Tables</h2>
      <button onClick={fetchTokens}>Refresh QR Codes</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {Array.from({ length: 30 }, (_, i) => i + 1).map(table => (
          <div key={table} style={{ margin: '20px' }}>
            <h3>Table {table}</h3>
            {tokens[table] ? (
              <QRCodeCanvas value={`https://cafe-frontend-pi.vercel.app/order?table=${table}&token=${tokens[table]}`} />
            ) : (
              <p>Loading...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;