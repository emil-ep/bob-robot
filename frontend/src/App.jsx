import './App.css'

import { Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import Navbar from './components/Navbar'
import OrdersPage from './pages/OrdersPage'
import RegisterPage from './pages/RegisterPage'
import RobotDetailPage from './pages/RobotDetailPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="App">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
        <Route path="/robot/:id" element={<RobotDetailPage user={user} />} />
        <Route path="/orders" element={<OrdersPage user={user} />} />
      </Routes>
    </div>
  )
}

export default App

// Made with Bob
