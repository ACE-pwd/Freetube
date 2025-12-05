import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TopicsList from './pages/TopicsList';
import TopicForm from './pages/TopicForm';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import './App.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
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
              element={<TopicsList />}
            />
            <Route
              path="/topics/new"
              element={
                <PrivateRoute>
                  <TopicForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/topics/:id/edit"
              element={
                <PrivateRoute>
                  <TopicForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
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
