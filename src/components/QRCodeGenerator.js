import { useState } from 'react';
import QRCode from 'qrcode.react';

function QRCodeGenerator() {
  const [tables] = useState([1, 2, 3, 4, 5, 6]);

  return (
    <div>
      <h2>QR Codes for Tables</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {tables.map(table => (
          <div key={table} style={{ margin: '20px' }}>
            <h3>Table {table}</h3>
            <QRCode value={`https://cafe-frontend-pi.vercel.app/order?table=${table}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;