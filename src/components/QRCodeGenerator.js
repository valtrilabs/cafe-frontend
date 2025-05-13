import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const tables = [1, 2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h2 className="text-2xl font-bold mb-4">QR Codes for Tables</h2>
      <p className="text-gray-600 mb-4">Print these QR codes and place them on the respective tables.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table} className="bg-white rounded-lg shadow-md p-4 text-center">
            <h3 className="text-lg font-semibold mb-2">Table {table}</h3>
            <QRCodeCanvas
              value={`https://cafe-frontend-pi.vercel.app/order?table=${table}`}
              size={200}
            />
            <p className="text-gray-600 mt-2">Scan to access the menu for Table {table}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;