import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react';
import { v4 as uuid } from 'uuid';
import { FaUtensils } from 'react-icons/fa';

function QRCodeGenerator() {
  const [qrCodes, setQRCodes] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchQRCodes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching tables from:', `${process.env.REACT_APP_API_URL}/api/session/tables`);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/session/tables`);
        console.log('Tables response:', response.data);
        const tablesData = response.data.tables || [];
        if (tablesData.length === 0) {
          setError('No tables found. Please configure tables in the backend.');
          return;
        }

        const qrCodesData = await Promise.all(
          tablesData.map(async (table) => {
            try {
              const sessionToken = uuid();
              console.log(`Generating session for table ${table.tableId} with token:`, sessionToken);
              const sessionResponse = await axios.post(`${process.env.REACT_APP_API_URL}/api/session`, {
                tableId: table.tableId,
                sessionToken
              });
              console.log(`Session for table ${table.tableId}:`, sessionResponse.data);
              if (!sessionResponse.data.sessionToken) {
                throw new Error(`No sessionToken returned for table ${table.tableId}`);
              }
              const qrCodeUrl = `${process.env.REACT_APP_FRONTEND_URL}/qr-prompt?table=${table.tableId}&session=${sessionResponse.data.sessionToken}`;
              console.log(`QR Code URL for table ${table.tableId}:`, qrCodeUrl);
              return { tableId: table.tableId, qrCodeUrl };
            } catch (err) {
              console.error(`Error creating session for table ${table.tableId}:`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
              });
              return null; // Skip this table
            }
          })
        );
        const validQRCodes = qrCodesData.filter(code => code !== null);
        if (validQRCodes.length === 0) {
          setError('Failed to generate any QR codes. Please check backend session creation.');
        } else {
          setQRCodes(validQRCodes);
        }
      } catch (err) {
        console.error('Error generating QR codes:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError('Failed to generate QR codes. Please check your connection or backend setup.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQRCodes();
  }, []);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="container mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center flex items-center justify-center" style={{ color: '#92400e' }}>
          <FaUtensils className="mr-2" /> GSaheb Cafe QR Codes
        </h1>
        {isLoading ? (
          <p className="text-center text-gray-600">Generating QR codes...</p>
        ) : error ? (
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : qrCodes.length === 0 ? (
          <p className="text-center text-gray-600">No QR codes available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {qrCodes.map(({ tableId, qrCodeUrl }) => (
              <div key={tableId} className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
                <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Table {tableId}</h2>
                <div className="flex justify-center mb-2 sm:mb-4">
                  <QRCode value={qrCodeUrl} size={150} />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 break-all">{qrCodeUrl}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QRCodeGenerator;