import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { topicsApi } from '../api';
import useAccount from '../useAccount';
import './TopicsList.css';
import './Course.css';
export default function Course() {
    const { id } = useParams(); const { account } = useAccount();
    const [course, setCourse] = useState(null); const [active, setActive] = useState('');
    const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setCourse(null); setError('');
            try {
                const { data } = await topicsApi.get(`/courses/${id}`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                setCourse(data);
                if (data.status === 'published') topicsApi.post(`/courses/${id}/view`, {}, { signal: controller.signal }).then(({ data: counts }) => { if (!controller.signal.aborted) setCourse(c => c ? { ...c, views: counts.views } : c); }).catch(() => {});
                setActive((data.lessons.find(l => !data.completed.includes(l.id)) || data.lessons[0])?.id || '');
            } catch (error) { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Unable to load course'); }
        }
        load(); return () => controller.abort();
    }, [id, revision]);
    const lesson = course?.lessons.find(l => l.id === active);
    async function complete() {
        if (busy || !lesson) return;
        const completed = !course.completed.includes(lesson.id); setBusy(true); setError('');
        try {
            await topicsApi.put(`/courses/${id}/progress/${lesson.id}`, { completed });
            setCourse(c => ({ ...c, completed: completed ? [...new Set([...c.completed, lesson.id])] : c.completed.filter(x => x !== lesson.id) }));
        } catch (error) { setError(error.response?.data?.message || 'Progress could not be saved. Please retry.'); }
        finally { setBusy(false); }
    }
    return <div className="topics-container"><Link className="back-btn" to="/courses">← Back to Courses</Link>
        {error && <div className="error-message" role="alert">{error} {!course && <button className="btn btn-outline" onClick={() => setRevision(r => r + 1)}>Retry</button>}</div>}
        {!course ? !error && <div className="loading-state">Loading course...</div> : <>
            <div className="topics-header"><h1 className="topics-title">{course.title}</h1>{account?.isAdmin && <Link className="btn btn-outline" to={`/courses/${id}/edit`}>Edit Course</Link>}</div>
            <div className="card course-overview"><div className="topic-header-row"><span className={`badge badge-${course.difficulty}`}>{{ easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' }[course.difficulty]}</span><span>{course.category} · Free lessons · {course.lessons.reduce((s, l) => s + l.minutes, 0)} min estimated</span>{course.status === 'draft' && <span className="badge badge-default">Draft preview</span>}</div>
                <p>{course.description}</p><p title="One view per learner per day; admin previews excluded">{(course.views || 0).toLocaleString()} course views</p><h3>Before you start</h3>{course.prerequisites?.length ? <ul>{course.prerequisites.map(topic => <li key={topic}>{topic}</li>)}</ul> : <p>{course.difficulty === 'easy' ? 'No prior knowledge required.' : 'Prerequisite topics have not been specified yet.'}</p>}<h3>What you’ll learn</h3><p className="course-text">{course.outcome}</p><h3>What you’ll need</h3><p className="course-text">{course.materials}</p>
                <p>{course.completed.length} of {course.lessons.length} lessons completed</p><progress aria-label="Course completion" max={course.lessons.length || 1} value={course.completed.length} />
                {course.lessons.length > 0 && course.completed.length === course.lessons.length && <p role="status">Course complete! Keep practising your new skill.</p>}
            </div>
            <div className="course-layout"><aside className="card course-outline"><h2>Course lessons</h2>{!course.lessons.length && <p>Add lessons in the editor to get started.</p>}{course.lessons.map((l, index) => <button key={l.id} className={`course-lesson ${active === l.id ? 'selected' : ''}`} aria-current={active === l.id ? 'step' : undefined} disabled={busy} onClick={() => setActive(l.id)}><span>{course.completed.includes(l.id) ? '✓' : index + 1}. {l.title}</span><small>{l.module ? `${l.module} · ` : ''}{l.minutes} min</small></button>)}</aside>
                {lesson && <section className="card course-content"><h2>{lesson.title}</h2>{lesson.videoId && <><iframe key={lesson.videoId} className="course-video" title={lesson.title} src={`https://www.youtube.com/embed/${lesson.videoId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p>Video by {lesson.creator} · <a href={`https://www.youtube.com/watch?v=${lesson.videoId}`} target="_blank" rel="noreferrer">Watch on YouTube</a></p><small>If the video is unavailable here, try the original on YouTube.</small></>}
                    {lesson.practice && <><h3>Your practice task</h3><p className="course-text">{lesson.practice}</p></>}
                    <div className="course-actions"><button className="btn btn-primary" disabled={busy || course.status !== 'published'} onClick={complete}>{busy ? 'Saving...' : course.completed.includes(lesson.id) ? 'Mark incomplete' : 'Mark lesson complete'}</button>{course.lessons.findIndex(l => l.id === active) < course.lessons.length - 1 && <button className="btn btn-outline" disabled={busy} onClick={() => setActive(course.lessons[course.lessons.findIndex(l => l.id === active) + 1].id)}>Next lesson →</button>}</div>
                    <small>Completion is your own practice record, not a skills assessment.</small>
                </section>}
            </div>
        </>}
    </div>;
}
