import React from 'react';
import {QRCode} from 'qrcode.react'; // Use default import
import { FaUtensils } from 'react-icons/fa';

function QRCodeGenerator() {
  const tables = Array.from({ length: 10 }, (_, i) => i + 1); // Tables 1 to 10
  const baseUrl = 'https://cafe-frontend-pi.vercel.app/menu?table=';

  return (
    <div className="min-h-screen bg-orange-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 flex items-center justify-center">
        <FaUtensils className="mr-2" style={{ color: '#b45309' }} /> QR Codes for GSaheb Cafe
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table} className="bg-white rounded-lg shadow-md p-4 text-center">
            <h2 className="text-lg font-semibold mb-2">Table {table}</h2>
            <QRCode
              value={`${baseUrl}${table}`}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
            <p className="mt-2 text-sm text-gray-600">
              Scan to access menu for Table {table}
            </p>
            <a
              href={`${baseUrl}${table}`}
              className="mt-2 inline-block text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Menu
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;