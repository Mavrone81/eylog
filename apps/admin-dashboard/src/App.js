import React, { useEffect, useState } from 'react';
import axios from 'axios';

const App = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.post('http://localhost:4000/graphql', {
        query: `
          query GetDeliveries {
            deliveries {
              id
              orderId
              status
              origin {
                address
              }
              destination {
                address
              }
              customer {
                name
              }
              driver {
                name
              }
            }
          }
        `,
      });
      setDeliveries(response.data.data.deliveries);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch deliveries');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard - Delivery Logistics</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Order ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Customer</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Driver</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Origin</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Destination</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.orderId}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.customer?.name || 'N/A'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.driver?.name || 'Unassigned'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.origin?.address}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{delivery.destination?.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
