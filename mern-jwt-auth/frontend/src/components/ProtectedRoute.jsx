import { Navigate } from 'react-router-dom';

// Redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
