import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Filter, Plus, Edit } from 'lucide-react';
import { topicsApi } from '../api';
import useAccount from '../useAccount';
import './TopicsList.css';

export default function Courses() {
    const { account } = useAccount();
    const [courses, setCourses] = useState([]);
    const [category, setCategory] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [sort, setSort] = useState('newest');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const [manage, setManage] = useState(false);
    const [page, setPage] = useState(1);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true); setError('');
            try {
                const { data } = await topicsApi.get(manage && account?.isAdmin ? '/courses/manage' : '/courses', { signal: controller.signal });
                if (!controller.signal.aborted) setCourses(data.courses);
            } catch (error) { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Unable to load courses.'); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load(); return () => controller.abort();
    }, [manage, account?.isAdmin, revision]);
    const filtered = courses.filter(c => (!category || c.category === category) && (!difficulty || c.difficulty === difficulty));
    if (sort === 'popular') filtered.sort((a, b) => (b.views || 0) - (a.views || 0) || a.title.localeCompare(b.title));
    if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'time') filtered.sort((a, b) => a.lessons.reduce((s, l) => s + l.minutes, 0) - b.lessons.reduce((s, l) => s + l.minutes, 0));
    const pages = Math.max(1, Math.ceil(filtered.length / 6));
    const current = Math.min(page, pages);
    return <div className="topics-container">
        <div className="topics-header"><h1 className="topics-title">Course Library</h1>
            {account?.isAdmin && <div className="topic-actions"><button className="btn btn-outline" onClick={() => { setManage(!manage); setPage(1); }}>{manage ? 'Published courses' : 'Manage drafts'}</button><Link to="/courses/new" className="btn btn-primary"><Plus className="icon-sm" /> Create Course</Link></div>}
        </div>
        <div className="filters-bar card">
            <select aria-label="Skill" className="sort-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">All Skills</option>{[...new Set(courses.map(c => c.category))].sort().map(c => <option key={c}>{c}</option>)}</select>
            <div className="filter-select-wrapper"><Filter className="filter-icon" /><select aria-label="Difficulty" className="filter-select" value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(1); }}><option value="">All Difficulties</option><option value="easy">Beginner</option><option value="medium">Intermediate</option><option value="hard">Advanced</option></select></div>
            <select aria-label="Sort courses" className="sort-select" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="newest">Newest First</option><option value="popular">Most Viewed</option><option value="title">Title (A–Z)</option><option value="time">Shortest First</option></select>
        </div>
        {error && <div className="error-message" role="alert">{error} <button className="btn btn-outline" onClick={() => setRevision(r => r + 1)}>Retry</button></div>}
        <div className="topics-list">
            {loading ? <div className="loading-state">Loading courses...</div> : !error && (!filtered.length ? <div className="empty-state card">{manage ? 'No courses yet. Create your first course.' : 'No courses available for these filters yet.'}</div> : filtered.slice((current - 1) * 6, current * 6).map(course => <div className="topic-card card" key={course.id}>
                <div className="topic-content"><div className="topic-header-row"><Link className="topic-title" to={`/courses/${course.id}`}>{course.title}</Link><span className={`badge badge-${course.difficulty}`}>{{ easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' }[course.difficulty]}</span>{course.status === 'draft' && <span className="badge badge-default">Draft</span>}</div>
                    <p className="topic-description">{course.description}</p><div className="topic-date"><BookOpen className="icon-sm" /> {course.category} · {course.lessons.length} lessons · {course.lessons.reduce((sum, l) => sum + l.minutes, 0)} min estimated · Free</div><p className="topic-date" title="One view per learner per day; admin previews excluded">{(course.views || 0).toLocaleString()} course views</p>{course.difficulty !== 'easy' && <p className="topic-date">Prerequisites: {course.prerequisites?.length ? course.prerequisites.join(', ') : 'Not specified yet'}</p>}
                </div>{account?.isAdmin && <Link className="action-btn action-btn-edit" aria-label={`Edit ${course.title}`} to={`/courses/${course.id}/edit`}><Edit className="icon-sm" /></Link>}
            </div>))}
        </div>
        {!loading && pages > 1 && <div className="pagination"><button className="pagination-btn" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current} of {pages}</span><button className="pagination-btn" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></div>}
    </div>;
}
