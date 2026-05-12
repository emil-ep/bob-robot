import { useEffect, useState } from 'react'

import API_ENDPOINTS from '../config/api'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function OrdersPage({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchOrders()
  }, [user, navigate])

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.ORDER_SERVICE}/api/orders/user/${user.id}`)
      setOrders(response.data.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load orders')
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading orders...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <main>
      <div className="container">
        <h2>My Orders</h2>
        {orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p>You haven't placed any orders yet.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/')}
              style={{ marginTop: '20px' }}
            >
              Browse Robots
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3>{order.robot_name}</h3>
                    <p style={{ color: '#666', margin: '5px 0' }}>
                      Order #{order.id} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p style={{ margin: '10px 0' }}>
                      <strong>Quantity:</strong> {order.quantity} × ${order.unit_price} = ${order.total_price}
                    </p>
                    <p style={{ margin: '10px 0' }}>
                      <strong>Shipping Address:</strong><br />
                      {order.shipping_address}
                    </p>
                  </div>
                  <div>
                    <span className={`order-status ${order.status}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default OrdersPage

// Made with Bob
