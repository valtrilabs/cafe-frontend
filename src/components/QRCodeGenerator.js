import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const [tokens, setTokens] = useState({});
  const [error, setError] = useState(null);

  const generateStaticTokens = () => {
    const newTokens = {};
    // Generate static tokens for tables 1 to 6 (or adjust as needed)
    for (let table = 1; table <= 6; table++) {
      // Use a fixed token format: "table-<tableNumber>-fixed"
      newTokens[table] = `table-${table}-fixed`;
    }
    setTokens(newTokens);
    setError(null);
  };

  useEffect(() => {
    generateStaticTokens();
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">QR Codes for Tables</h2>
      {error && <div className="text-center text-red-600 mb-4">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(tokens).map(([table, token]) => (
          <div key={table} className="bg-white rounded-lg shadow-md p-4 text-center">
            <h3 className="text-lg font-semibold mb-2">Table {table}</h3>
            <QRCodeCanvas
              value={`https://cafe-frontend-pi.vercel.app/order?table=${table}&token=${token}`}
              size={200}
            />
            <p className="mt-2 text-gray-600">Print this QR code for Table {table}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;