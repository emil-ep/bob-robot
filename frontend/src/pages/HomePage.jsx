import { useEffect, useState } from 'react'

import API_ENDPOINTS from '../config/api'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const [robots, setRobots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRobots()
  }, [])

  const fetchRobots = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.INVENTORY_SERVICE}/api/inventory/robots`)
      setRobots(response.data.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load robots')
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading robots...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <main>
      <div className="container">
        <h2>Available Robots</h2>
        <div className="robots-grid">
          {robots.map(robot => (
            <div 
              key={robot.id} 
              className="robot-card"
              onClick={() => navigate(`/robot/${robot.id}`)}
            >
              <img src={robot.image_url} alt={robot.name} />
              <div className="robot-card-content">
                <h3>{robot.name}</h3>
                <div className="model">{robot.model}</div>
                <div className="price">${robot.price}</div>
                <div className="stock">In Stock: {robot.stock}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default HomePage

// Made with Bob
