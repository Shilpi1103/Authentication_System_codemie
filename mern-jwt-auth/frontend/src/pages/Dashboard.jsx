import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../services/authService';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setUser(res.data);
      } catch (err) {
        // Token is invalid or expired — force logout
        setError('Session expired. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }, 2000);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>

        {error && <p className="message error">{error}</p>}

        {user ? (
          <div className="profile-info">
            <div className="welcome-message">
              <h3>Welcome, {user.name}!</h3>
              <p>You are successfully logged in.</p>
            </div>
            <div className="user-details">
              <div className="detail-row">
                <span className="detail-label">Name</span>
                <span className="detail-value">{user.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{user.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">User ID</span>
                <span className="detail-value user-id">{user.id}</span>
              </div>
            </div>
          </div>
        ) : (
          !error && <p className="loading-text">Loading profile...</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
