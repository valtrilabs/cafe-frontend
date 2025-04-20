import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';

function QRCodeGenerator() {
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://cafe-frontend-pi.vercel.app';
  const [tableTokens, setTableTokens] = useState({});

  useEffect(() => {
    const fetchTokens = async () => {
      const tokens = {};
      for (let table = 1; table <= 6; table++) {
        try {
          const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions`, {
            tableNumber: table
          });
          tokens[table] = response.data.token;
        } catch (err) {
          console.error(`Error generating token for table ${table}:`, err);
        }
      }
      setTableTokens(tokens);
    };
    fetchTokens();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Codes for Tables</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(table => (
          <div key={table} className="text-center">
            <h2 className="font-semibold">Table {table}</h2>
            {tableTokens[table] ? (
              <QRCodeCanvas value={`${baseUrl}/order?table=${table}&token=${tableTokens[table]}`} />
            ) : (
              <p>Loading QR code...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;