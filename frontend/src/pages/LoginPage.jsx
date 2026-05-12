import { Link, useNavigate } from 'react-router-dom'

import API_ENDPOINTS from '../config/api'
import axios from 'axios'
import { useState } from 'react'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_ENDPOINTS.USER_SERVICE}/api/users/login`, {
        email,
        password
      })

      const { user, token } = response.data.data
      onLogin(user, token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <div className="auth-container">
        <div className="card">
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p style={{ marginTop: '20px', textAlign: 'center' }}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
          <p style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
            Test account: test@robotshop.com / password123
          </p>
        </div>
      </div>
    </main>
  )
}

export default LoginPage

// Made with Bob
