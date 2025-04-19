import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

function QRCodeGenerator() {
  const numberOfTables = 10; // Adjust as needed
  const baseUrl = 'https://cafe-frontend-pi.vercel.app/menu';

  console.log('Generating QR codes with base URL:', baseUrl);
  const tableNumbers = Array.from({ length: numberOfTables }, (_, index) => index + 1);
  tableNumbers.forEach(tableNumber => {
    console.log(`Table ${tableNumber} QR URL: ${baseUrl}?table=${tableNumber}`);
  });

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
      <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tableNumbers.map(tableNumber => {
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
        })}
      </div>
    </div>
  );
}

export default QRCodeGenerator;