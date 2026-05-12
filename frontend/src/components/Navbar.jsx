import { Link } from 'react-router-dom'

function Navbar({ user, onLogout }) {
  return (
    <nav>
      <div className="container">
        <Link to="/">
          <h1>🤖 Robot Shop</h1>
        </Link>
        <ul>
          <li><Link to="/">Home</Link></li>
          {user ? (
            <>
              <li><Link to="/orders">My Orders</Link></li>
              <li>
                <span style={{ marginRight: '10px' }}>
                  Hello, {user.firstName}!
                </span>
              </li>
              <li>
                <button onClick={onLogout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navbar

// Made with Bob
