import { Link } from 'react-router-dom';
import { BookOpen, LogOut, User, LayoutDashboard } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        window.location.href = '/login';
    };

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-brand">
                    <BookOpen className="icon" />
                    <span>FreeLearn</span>
                </Link>

                <div className="navbar-links">
                    <Link to="/topics" className="nav-link">
                        Topics
                    </Link>

                    {token ? (
                        <>
                            <Link to="/dashboard" className="nav-link">
                                <LayoutDashboard className="icon-sm" />
                                <span>Dashboard</span>
                            </Link>
                            <Link to="/profile" className="nav-link">
                                <User className="icon-sm" />
                                <span>Profile</span>
                            </Link>
                            <button onClick={handleLogout} className="nav-link logout-btn">
                                <LogOut className="icon-sm" />
                                <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/signup" className="btn btn-outline">
                                Signup
                            </Link>
                            <Link to="/login" className="btn btn-primary">
                                Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
