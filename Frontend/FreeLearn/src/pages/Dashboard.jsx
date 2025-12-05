import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const email = localStorage.getItem('email');

    return (
        <div className="dashboard-container">
            <div className="welcome-card card">
                <h1 className="welcome-title">Hello, {email?.split('@')[0]}!</h1>
                <p className="welcome-text">Welcome to your dashboard. What would you like to learn today?</p>
            </div>

            <div className="dashboard-grid">
                <Link to="/topics" className="dashboard-card card">
                    <div className="card-header">
                        <div className="icon-bg icon-bg-primary">
                            <BookOpen className="icon-md text-primary" />
                        </div>
                    </div>
                    <h3 className="card-title">Browse Topics</h3>
                    <p className="card-desc">Explore our library of structured learning materials.</p>
                </Link>

                <Link to="/topics/new" className="dashboard-card card">
                    <div className="card-header">
                        <div className="icon-bg icon-bg-success">
                            <Plus className="icon-md text-success" />
                        </div>
                    </div>
                    <h3 className="card-title">Create New Topic</h3>
                    <p className="card-desc">Share your knowledge by adding a new topic to the platform.</p>
                </Link>
            </div>
        </div>
    );
}
