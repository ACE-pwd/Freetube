import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { topicsApi } from '../api';
import useAccount from '../useAccount';
import './Dashboard.css';
export default function Dashboard() {
    const { account } = useAccount();
    const [courses, setCourses] = useState([]); const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const controller = new AbortController();
        topicsApi.get('/courses/progress', { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) { setCourses(data.courses); setLoading(false); }
        }).catch(error => { if (!controller.signal.aborted) { setError(error.response?.data?.message || 'Unable to load progress. Please refresh.'); setLoading(false); } });
        return () => controller.abort();
    }, []);
    return <div className="dashboard-container">
        <div className="welcome-card card"><h1 className="welcome-title">Hello, {(account?.email || localStorage.getItem('email'))?.split('@')[0]}!</h1><p className="welcome-text">Pick a creative skill or continue your learning journey.</p></div>
        <div className="dashboard-grid"><Link to="/courses" className="dashboard-card card"><div className="card-header"><div className="icon-bg icon-bg-primary"><BookOpen className="icon-md text-primary" /></div></div><h3 className="card-title">Browse Courses</h3><p className="card-desc">Explore free courses organised by skill and difficulty.</p></Link>
            {account?.isAdmin && <Link to="/courses/new" className="dashboard-card card"><div className="card-header"><div className="icon-bg icon-bg-success"><Plus className="icon-md text-success" /></div></div><h3 className="card-title">Create New Course</h3><p className="card-desc">Arrange lessons, add practice tasks, and publish a reviewed course.</p></Link>}
            {courses.map(course => <Link key={course.id} to={`/courses/${course.id}`} className="dashboard-card card"><h3 className="card-title">{course.title}</h3><p className="card-desc">{course.completed.length} of {course.lessons.length} lessons complete</p><progress aria-label={`${course.title} progress`} max={course.lessons.length || 1} value={course.completed.length} /><p>{course.completed.length === course.lessons.length ? 'Revisit course' : 'Continue learning →'}</p></Link>)}
        </div>{loading && <p role="status">Loading your progress...</p>}{error && <p className="error-message" role="alert">{error}</p>}{!loading && !error && !courses.length && <p>Choose a course and complete your first lesson to see your progress here.</p>}
    </div>;
}
