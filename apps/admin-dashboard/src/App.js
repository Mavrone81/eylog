import React, { useEffect, useState } from 'react';
import axios from 'axios';

const App = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    orderId: '',
    origin: { address: '', lat: 0, lng: 0 },
    destination: { address: '', lat: 0, lng: 0 },
    customerId: ''
  });

  const fetchDeliveries = async () => {
    try {
      const response = await axios.post('http://localhost:4000/graphql', {
        query: `
          query GetDeliveries {
            deliveries {
              id
              orderId
              status
              origin { address }
              destination { address }
              customer { name }
              driver { name }
            }
          }
        `,
      });
      if (response.data.data) {
        setDeliveries(response.data.data.deliveries || []);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch deliveries. Make sure the backend is running.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/graphql', {
        query: `
          mutation CreateDelivery($orderId: String!, $origin: LocationInput!, $destination: LocationInput!, $customerId: ID!) {
            createDelivery(orderId: $orderId, origin: $origin, destination: $destination, customerId: $customerId) {
              id
              orderId
            }
          }
        `,
        variables: {
          orderId: form.orderId,
          origin: { ...form.origin, lat: parseFloat(form.origin.lat), lng: parseFloat(form.origin.lng) },
          destination: { ...form.destination, lat: parseFloat(form.destination.lat), lng: parseFloat(form.destination.lng) },
          customerId: form.customerId
        }
      });
      setForm({ orderId: '', origin: { address: '', lat: 0, lng: 0 }, destination: { address: '', lat: 0, lng: 0 }, customerId: '' });
      fetchDeliveries();
    } catch (err) {
      alert('Failed to create delivery');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ borderBottom: '2px solid #eee', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ color: '#333' }}>Admin Dashboard - AI Logistics</h1>
      </header>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>{error}</div>}

      <section style={{ marginBottom: '40px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
        <h3>Create New Delivery</h3>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <input
            placeholder="Order ID"
            value={form.orderId}
            onChange={e => setForm({...form, orderId: e.target.value})}
            style={inputStyle}
            required
          />
          <input
            placeholder="Customer ID"
            value={form.customerId}
            onChange={e => setForm({...form, customerId: e.target.value})}
            style={inputStyle}
            required
          />
          <div style={{ gridColumn: 'span 2' }}>
            <h4 style={{ margin: '10px 0 5px' }}>Origin</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                placeholder="Address"
                value={form.origin.address}
                onChange={e => setForm({...form, origin: {...form.origin, address: e.target.value}})}
                style={{...inputStyle, flex: 2}}
              />
              <input
                placeholder="Lat"
                value={form.origin.lat}
                onChange={e => setForm({...form, origin: {...form.origin, lat: e.target.value}})}
                style={{...inputStyle, flex: 1}}
              />
              <input
                placeholder="Lng"
                value={form.origin.lng}
                onChange={e => setForm({...form, origin: {...form.origin, lng: e.target.value}})}
                style={{...inputStyle, flex: 1}}
              />
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <h4 style={{ margin: '10px 0 5px' }}>Destination</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                placeholder="Address"
                value={form.destination.address}
                onChange={e => setForm({...form, destination: {...form.destination, address: e.target.value}})}
                style={{...inputStyle, flex: 2}}
              />
              <input
                placeholder="Lat"
                value={form.destination.lat}
                onChange={e => setForm({...form, destination: {...form.destination, lat: e.target.value}})}
                style={{...inputStyle, flex: 1}}
              />
              <input
                placeholder="Lng"
                value={form.destination.lng}
                onChange={e => setForm({...form, destination: {...form.destination, lng: e.target.value}})}
                style={{...inputStyle, flex: 1}}
              />
            </div>
          </div>
          <button type="submit" style={buttonStyle}>Create & Optimize Delivery</button>
        </form>
      </section>

      <section>
        <h3>Active Deliveries</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#eee' }}>
            <tr>
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Origin</th>
              <th style={thStyle}>Destination</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No deliveries found</td></tr>
            ) : deliveries.map((delivery) => (
              <tr key={delivery.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{delivery.orderId}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.8em',
                    background: delivery.status === 'DELIVERED' ? '#dfd' : '#ffd',
                    color: delivery.status === 'DELIVERED' ? '#383' : '#883'
                  }}>
                    {delivery.status}
                  </span>
                </td>
                <td style={tdStyle}>{delivery.customer?.name || 'N/A'}</td>
                <td style={tdStyle}>{delivery.driver?.name || 'Unassigned'}</td>
                <td style={tdStyle}>{delivery.origin?.address}</td>
                <td style={tdStyle}>{delivery.destination?.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

const inputStyle = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  fontSize: '14px'
};

const buttonStyle = {
  gridColumn: 'span 2',
  padding: '10px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold'
};

const thStyle = { border: '1px solid #ddd', padding: '12px', textAlign: 'left' };
const tdStyle = { border: '1px solid #ddd', padding: '12px' };

export default App;
