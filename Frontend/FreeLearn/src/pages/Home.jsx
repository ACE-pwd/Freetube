import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, CheckCircle } from 'lucide-react';
import './Home.css';

export default function Home() {
    return (
        <div className="home-container">
            <div className="hero-section">
                <div className="hero-icon">
                    <BookOpen className="icon-lg" />
                </div>

                <h1 className="hero-title">
                    Master New Skills with <span className="highlight">FreeLearn</span>
                </h1>

                <p className="hero-subtitle">
                    Discover creative skills through free, structured courses. Follow lessons at your level, practise at your pace, and make something of your own.
                </p>

                <div className="hero-buttons">
                    <Link to="/courses" className="btn btn-primary btn-lg">
                        <span>Explore Courses</span>
                        <ArrowRight className="icon-sm ml-2" />
                    </Link>
                    <Link to="/login" className="btn btn-outline btn-lg">
                        Get Started
                    </Link>
                </div>
            </div>

            <div className="features-grid">
                {[
                    { title: 'Structured Learning', desc: 'Ready-made courses in creative skills, arranged step by step.' },
                    { title: 'Track Progress', desc: 'Keep track of what you have learned and what comes next.' },
                    { title: 'Create Something', desc: 'Turn each lesson into practice, from your first strokes to your first melody.' },
                ].map((item, index) => (
                    <div key={index} className="feature-card">
                        <CheckCircle className="feature-icon" />
                        <h3 className="feature-title">{item.title}</h3>
                        <p className="feature-desc">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
