import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const tables = [1, 2, 3, 4, 5, 6];
  const frontendUrl = 'https://cafe-frontend-pi.vercel.app';

  const downloadQRCode = (table) => {
    const canvas = document.getElementById(`qr-table-${table}`);
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `GSahebCafe_Table_${table}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h2 className="text-2xl font-bold mb-4">QR Codes for Tables</h2>
      <p className="text-gray-600 mb-4">Download and print these QR codes to place on each table.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table} className="bg-white rounded-lg shadow-md p-4 text-center">
            <h3 className="text-lg font-semibold mb-2">Table {table}</h3>
            <QRCodeCanvas
              id={`qr-table-${table}`}
              value={`${frontendUrl}/order?table=${table}`}
              size={150}
            />
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => downloadQRCode(table)}
            >
              Download QR Code
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;