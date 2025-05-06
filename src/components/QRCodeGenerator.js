import { QRCodeCanvas } from 'qrcode.react';

function QRCodeGenerator() {
  const tables = [1, 2, 3, 4, 5, 6]; // Define the table numbers

  return (
    <div>
      <h2>Static QR Codes for Tables</h2>
      <p>These QR codes are static and can be printed for each table.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {tables.map(table => (
          <div key={table} style={{ margin: '20px' }}>
            <h3>Table {table}</h3>
            <QRCodeCanvas value={`https://cafe-frontend-pi.vercel.app/scan-qr?table=${table}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default QRCodeGenerator;