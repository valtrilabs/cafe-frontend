import React from 'react';
     import { QRCode } from 'qrcode.react';
     import { saveAs } from 'file-saver';

     function QRCodeGenerator() {
       const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'https://cafe-frontend-pi.vercel.app';
       const tables = [1, 2, 3, 4, 5, 6];

       const downloadQRCode = (tableNumber) => {
         const canvas = document.getElementById(`qr-code-${tableNumber}`);
         canvas.toBlob((blob) => {
           saveAs(blob, `GSahebCafe_Table_${tableNumber}_QR.png`);
         });
       };

       return (
         <div className="min-h-screen bg-orange-50 p-4">
           <h1 className="text-2xl font-bold text-center mb-6">QR Codes for Tables</h1>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
             {tables.map((table) => (
               <div key={table} className="bg-white p-4 rounded-lg shadow-md text-center">
                 <h2 className="text-lg font-semibold mb-2">Table {table}</h2>
                 <QRCode
                   id={`qr-code-${table}`}
                   value={`${frontendUrl}/order?table=${table}`}
                   size={200}
                   level="H"
                   includeMargin={true}
                 />
                 <button
                   className="mt-4 px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-700"
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