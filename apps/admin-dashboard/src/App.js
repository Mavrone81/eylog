import React, { useEffect, useState } from 'react';
import axios from 'axios';

const App = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const graphqlUrl = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql';
        const response = await axios.post(graphqlUrl, {
          query: `
            query GetDeliveries {
              deliveries {
                id
                status
                origin { address }
                destination { address }
              }
            }
          `
        });
        setDeliveries(response.data.data.deliveries);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard - Delivery Logistics</h1>
      {loading ? (
        <p>Loading deliveries...</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Origin</th>
              <th>Destination</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td>{delivery.id}</td>
                <td>{delivery.status}</td>
                <td>{delivery.origin?.address}</td>
                <td>{delivery.destination?.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default App;
