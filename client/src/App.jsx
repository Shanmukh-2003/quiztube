import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VideoDetail from './pages/VideoDetail';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Digest from './pages/Digest';
import Stats from './pages/Stats';
import SharedQuiz from './pages/SharedQuiz';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/shared/:token" element={<SharedQuiz />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/video/:id" element={<PrivateRoute><VideoDetail /></PrivateRoute>} />
          <Route path="/quiz/:videoId" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          <Route path="/result/:attemptId" element={<PrivateRoute><Result /></PrivateRoute>} />
          <Route path="/digest" element={<PrivateRoute><Digest /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
