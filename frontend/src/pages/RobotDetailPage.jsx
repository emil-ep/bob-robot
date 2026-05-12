import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import API_ENDPOINTS from '../config/api'
import axios from 'axios'

function RobotDetailPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [robot, setRobot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [shippingAddress, setShippingAddress] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    fetchRobot()
  }, [id])

  const fetchRobot = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.INVENTORY_SERVICE}/api/inventory/robots/${id}`)
      setRobot(response.data.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load robot details')
      setLoading(false)
    }
  }

  const handleOrder = async (e) => {
    e.preventDefault()
    
    if (!user) {
      navigate('/login')
      return
    }

    setOrderLoading(true)
    setOrderError('')
    setOrderSuccess(false)

    try {
      await axios.post(`${API_ENDPOINTS.ORDER_SERVICE}/api/orders`, {
        userId: user.id,
        robotId: robot.id,
        quantity: parseInt(quantity),
        shippingAddress
      })
      
      setOrderSuccess(true)
      setTimeout(() => {
        navigate('/orders')
      }, 2000)
    } catch (err) {
      setOrderError(err.response?.data?.error || 'Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading robot details...</div>
  if (error) return <div className="error">{error}</div>
  if (!robot) return <div className="error">Robot not found</div>

  return (
    <main>
      <div className="container robot-detail">
        <div className="card">
          <div className="robot-detail-content">
            <div>
              <img src={robot.image_url} alt={robot.name} />
            </div>
            <div className="robot-info">
              <h1>{robot.name}</h1>
              <div className="model">Model: {robot.model}</div>
              <div className="price">${robot.price}</div>
              <div className="description">{robot.description}</div>
              <div style={{ marginTop: '20px' }}>
                <strong>Category:</strong> {robot.category}
              </div>
              <div style={{ marginTop: '10px' }}>
                <strong>Available Stock:</strong> {robot.stock} units
              </div>

              {user && robot.stock > 0 && (
                <div className="order-form">
                  <h3>Place Order</h3>
                  <form onSubmit={handleOrder}>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max={robot.stock}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Shipping Address</label>
                      <textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows="3"
                        required
                        placeholder="Enter your shipping address"
                      />
                    </div>
                    {orderError && <div className="error">{orderError}</div>}
                    {orderSuccess && <div className="success">Order placed successfully! Redirecting...</div>}
                    <button 
                      type="submit" 
                      className="btn btn-success" 
                      disabled={orderLoading}
                    >
                      {orderLoading ? 'Placing Order...' : `Order Now - $${(robot.price * quantity).toFixed(2)}`}
                    </button>
                  </form>
                </div>
              )}

              {!user && (
                <div style={{ marginTop: '30px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/login')}
                  >
                    Login to Order
                  </button>
                </div>
              )}

              {robot.stock === 0 && (
                <div style={{ marginTop: '30px', color: '#dc3545', fontWeight: 'bold' }}>
                  Out of Stock
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default RobotDetailPage

// Made with Bob
