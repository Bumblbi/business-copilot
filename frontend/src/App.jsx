import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Layout/Header';

// Импорт страниц из папки pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChatPage from './pages/ChatPage';
import BusinessAdvicePage from './pages/BusinessAdvicePage';
import OperationalDirector from './pages/OperationalDirector';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-red-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<ChatPage />} />
            
            <Route
              path="/advice"
              element={
                <ProtectedRoute>
                  <BusinessAdvicePage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/operational"
              element={
                <ProtectedRoute>
                  <OperationalDirector />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;