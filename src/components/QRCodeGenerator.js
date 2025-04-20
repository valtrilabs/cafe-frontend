import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const [qrCodes, setQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://cafe-frontend-pi.vercel.app';

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching tokens from:', process.env.REACT_APP_API_URL);
        const tables = [1, 2, 3, 4, 5, 6];
        const codes = await Promise.all(
          tables.map(async (table) => {
            try {
              const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions`, { tableNumber: table });
              console.log(`Table ${table} token:`, res.data.token);
              return {
                table,
                url: `${baseUrl}/order?table=${table}&token=${res.data.token}`,
              };
            } catch (err) {
              console.error(`Error generating token for table ${table}:`, err.response?.data || err.message);
              throw err;
            }
          })
        );
        setQRCodes(codes);
      } catch (err) {
        console.error('Error generating QR codes:', err);
        setError('Failed to generate QR codes. Please try again or contact support.');
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Codes for Tables</h1>
      {loading ? (
        <p className="text-gray-600">Generating QR codes...</p>
      ) : error ? (
        <div className="text-red-600">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : qrCodes.length === 0 ? (
        <p className="text-gray-600">No QR codes generated. Please try again.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {qrCodes.map(({ table, url }) => (
            <div key={table} className="text-center">
              <h2 className="font-semibold">Table {table}</h2>
              <QRCodeCanvas value={url} size={150} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QRCodeGenerator;