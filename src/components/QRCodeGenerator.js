import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

function QRCodeGenerator() {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const baseUrl = 'https://cafe-frontend-pi.vercel.app/menu';

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/tables`)
      .then(res => {
        console.log('Fetched tables:', res.data);
        setTables(res.data); // Expecting array of table numbers or objects
        res.data.forEach(table => {
          const tableNumber = table.number || table;
          console.log(`Table ${tableNumber} QR URL: ${baseUrl}?table=${tableNumber}`);
        });
      })
      .catch(err => {
        console.error('Error fetching tables:', err);
        setError('Failed to load tables. Please try again.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800">
          Scan QR Code for GSaheb Cafe
        </h1>
        <p className="text-center text-gray-600 mt-2">
          Select a table by scanning the QR code below
        </p>
      </header>
      {error && <p className="text-center text-red-600">{error}</p>}
      <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tables.length === 0 && !error ? (
          <p className="text-center text-gray-600">Loading tables...</p>
        ) : (
          tables.map(table => {
            const tableNumber = table.number || table;
            const qrUrl = `${baseUrl}?table=${tableNumber}`;
            return (
              <div
                key={tableNumber}
                className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center"
              >
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Table {tableNumber}
                </h2>
                <QRCodeSVG
                  value={qrUrl}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
                <p className="text-sm text-gray-600 mt-2">Scan for Table {tableNumber}</p>
                <a
                  href={qrUrl}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Menu for Table {tableNumber}
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default QRCodeGenerator;