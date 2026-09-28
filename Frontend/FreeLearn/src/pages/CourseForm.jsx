import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { topicsApi } from '../api';
import useAccount from '../useAccount';
import './TopicForm.css';
import './Course.css';
const blank = () => ({ title: '', category: '', description: '', difficulty: 'easy', materials: '', outcome: '', status: 'draft', prerequisites: [], lessons: [] });
const lesson = () => ({ id: crypto.randomUUID(), title: '', module: '', creator: '', videoId: '', practice: '', minutes: 15 });
export default function CourseForm() {
    const { id } = useParams(); const navigate = useNavigate();
    const { account, loading: accountLoading, error: accountError } = useAccount();
    const [form, setForm] = useState(blank);
    const [loaded, setLoaded] = useState(!id);
    const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
    const [playlist, setPlaylist] = useState(''); const [importing, setImporting] = useState(false); const [notice, setNotice] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoaded(!id); setForm(blank()); setError('');
            if (!id) return;
            try { const { data } = await topicsApi.get(`/courses/${id}`, { signal: controller.signal }); if (!controller.signal.aborted) { setForm(data); setLoaded(true); } }
            catch (error) { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Unable to load course'); }
        }
        load(); return () => controller.abort();
    }, [id]);
    const field = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const updateLesson = (id, key, value) => setForm(f => ({ ...f, lessons: f.lessons.map(l => l.id === id ? { ...l, [key]: value } : l) }));
    const move = (index, direction) => setForm(f => { const lessons = [...f.lessons]; [lessons[index], lessons[index + direction]] = [lessons[index + direction], lessons[index]]; return { ...f, lessons }; });
    async function importVideos() {
        setImporting(true); setError(''); setNotice('');
        try {
            const { data } = await topicsApi.post('/courses/import-playlist', { url: playlist }, { timeout: 60000 });
            const existing = new Set(form.lessons.map(l => l.videoId));
            const incoming = data.lessons.filter(l => !existing.has(l.videoId));
            if (form.lessons.length + incoming.length > 200) throw new Error('A course can contain up to 200 lessons');
            field('lessons', [...form.lessons, ...incoming]);
            setNotice(`Added ${incoming.length} lessons; skipped ${data.skipped} unavailable videos. ${data.message}`);
        } catch (error) { setError(error.response?.data?.message || error.message || 'Import failed'); }
        finally { setImporting(false); }
    }
    async function save(event) {
        event.preventDefault(); if (!loaded || busy || importing) return;
        setBusy(true); setError('');
        try { const payload = { ...form, prerequisites: (form.prerequisites || []).map(p => p.trim()).filter(Boolean) }; const { data } = id ? await topicsApi.put(`/courses/${id}`, payload) : await topicsApi.post('/courses', payload); navigate(`/courses/${data.id}`); }
        catch (error) { setError(error.response?.data?.message || 'Unable to save course'); }
        finally { setBusy(false); }
    }
    if (accountLoading) return <div className="loading-state">Loading editor...</div>;
    if (!account?.isAdmin) return <div className="empty-state card">{accountError || 'Course editing is available to designated editors only.'} <Link to="/courses">Browse courses</Link></div>;
    return <div className="form-container"><Link to="/courses" className="back-btn">← Back to Courses</Link><div className="form-card card"><h1 className="form-title">{id ? 'Edit Course' : 'Create Course'}</h1>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
        <form className="topic-form" onSubmit={save}><fieldset className="course-fieldset" disabled={!loaded || busy || importing}>
            {[['title', 'Course title', 200], ['category', 'Skill (e.g. Calligraphy)', 80]].map(([key, label, max]) => <label className="input-group" key={key}><span className="input-label">{label}</span><input required maxLength={max} className="input-field" value={form[key]} onChange={e => field(key, e.target.value)} /></label>)}
            {[['description', 'About this course', 3000], ['materials', 'Materials and costs — include what learners need', 2000], ['outcome', 'What learners will be able to do', 2000]].map(([key, label, max]) => <label className="input-group" key={key}><span className="input-label">{label}</span><textarea className="input-field textarea-field" maxLength={max} value={form[key]} onChange={e => field(key, e.target.value)} /></label>)}
            <label className="input-group"><span className="input-label">Difficulty</span><select className="input-field" value={form.difficulty} onChange={e => field('difficulty', e.target.value)}><option value="easy">Beginner</option><option value="medium">Intermediate</option><option value="hard">Advanced</option></select></label>
            <label className="input-group"><span className="input-label">Prerequisite topics {form.difficulty !== 'easy' ? '(required before publishing)' : '(optional)'}</span><textarea className="input-field textarea-field" value={(form.prerequisites || []).join('\n')} onChange={e => field('prerequisites', e.target.value.split('\n'))} placeholder="One topic per line, e.g. HTML structure, CSS selectors" /><small>List the knowledge learners should already have. These are guidance, not enrolment restrictions.</small></label>
            <div className="input-group"><label className="input-label" htmlFor="playlist">Import a YouTube playlist (optional)</label><input id="playlist" className="input-field" value={playlist} onChange={e => setPlaylist(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." /><button type="button" className="btn btn-outline" disabled={!playlist} onClick={importVideos}>Import lessons</button></div>
            <h2>Lessons in learning order</h2>
            {form.lessons.map((l, index) => <section className="card course-editor-lesson" key={l.id}><h3>Lesson {index + 1}</h3>
                {[['title', 'Lesson title'], ['module', 'Module'], ['videoId', 'YouTube link or video ID (optional)'], ['creator', 'Original creator / channel']].map(([key, label]) => <label className="input-group" key={key}><span className="input-label">{label}</span><input className="input-field" required={key === 'title'} value={l[key]} onChange={e => updateLesson(l.id, key, e.target.value)} /></label>)}
                <label className="input-group"><span className="input-label">Estimated study and practice time (minutes)</span><input className="input-field" type="number" min="1" max="1440" required value={l.minutes} onChange={e => updateLesson(l.id, 'minutes', Number(e.target.value))} /></label>
                <label className="input-group"><span className="input-label">Practice task / instructions</span><textarea className="input-field textarea-field" maxLength={4000} value={l.practice} onChange={e => updateLesson(l.id, 'practice', e.target.value)} /></label>
                <div className="course-actions"><button type="button" className="btn btn-outline" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button><button type="button" className="btn btn-outline" disabled={index === form.lessons.length - 1} onClick={() => move(index, 1)}>Move down</button><button type="button" className="btn btn-outline" onClick={() => field('lessons', form.lessons.filter(x => x.id !== l.id))}>Remove</button></div>
            </section>)}
            <button type="button" className="btn btn-outline" disabled={form.lessons.length >= 200} onClick={() => field('lessons', [...form.lessons, lesson()])}>+ Add lesson</button>
            <label className="input-group"><span className="input-label">Publication</span><select className="input-field" value={form.status} onChange={e => field('status', e.target.value)}><option value="draft">Draft — only editors can see it</option><option value="published">Published — visible in the catalogue</option></select></label>
            <p>Review every resource, creator credit, estimated time and practice task before publishing. Importing a playlist does not review its teaching quality.</p>
            <button className="btn btn-primary btn-submit" type="submit">{busy ? 'Saving...' : 'Save Course'}</button>
        </fieldset></form>{importing && <p role="status">Importing playlist...</p>}
    </div></div>;
}
