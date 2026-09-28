import { sessionToken } from './session';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Course from './pages/Course';
import CourseForm from './pages/CourseForm';

import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import './App.css';

function PrivateRoute({ children }) {
  const token = sessionToken();
  const location = useLocation();
  return token ? children : <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/topics"
              element={<Navigate to="/courses" replace />}
            />
            <Route
              path="/topics/new"
              element={
                <PrivateRoute>
                  <CourseForm />
                </PrivateRoute>
              }
            />
            <Route path="/topics/:id/edit" element={<Navigate to="/courses" replace />} />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/new" element={<PrivateRoute><CourseForm /></PrivateRoute>} />
            <Route path="/courses/:id/edit" element={<PrivateRoute><CourseForm /></PrivateRoute>} />
            <Route path="/courses/:id" element={<PrivateRoute><Course /></PrivateRoute>} />
          </Routes>
        </main>
        <footer className="footer">
          &copy; {new Date().getFullYear()} FreeLearn. All rights reserved.
        </footer>
      </div>
    </Router>
  );
}

export default App;
