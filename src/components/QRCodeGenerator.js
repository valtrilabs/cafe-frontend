import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const [qrCodes, setQRCodes] = useState([]);
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://cafe-frontend-pi.vercel.app';

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const tables = [1, 2, 3, 4, 5, 6];
        const codes = await Promise.all(
          tables.map(async (table) => {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/sessions`, { tableNumber: table });
            return {
              table,
              url: `${baseUrl}/order?table=${table}&token=${res.data.token}`,
            };
          })
        );
        setQRCodes(codes);
      } catch (err) {
        console.error('Error generating QR codes:', err);
      }
    };
    fetchTokens();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Codes for Tables</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {qrCodes.map(({ table, url }) => (
          <div key={table} className="text-center">
            <h2 className="font-semibold">Table {table}</h2>
            <QRCodeCanvas value={url} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;