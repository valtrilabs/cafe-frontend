import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://cafe-frontend-pi.vercel.app';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Codes for Tables</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(table => (
          <div key={table} className="text-center">
            <h2 className="font-semibold">Table {table}</h2>
            <QRCodeCanvas value={`${baseUrl}/order?table=${table}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;