import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { topicsApi } from '../api';
import { Save, ArrowLeft } from 'lucide-react';
import './TopicForm.css';

export default function TopicForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'easy',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadedId, setLoadedId] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        async function fetchTopic() {
            setError('');
            setLoadedId(null);
            if (!id) {
                setFormData({ title: '', description: '', difficulty: 'easy' });
                return;
            }
            try {
                const response = await topicsApi.get(`/topics/${id}`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                const { title, description, difficulty } = response.data;
                setFormData({ title, description: description || '', difficulty: difficulty || 'easy' });
                setLoadedId(id);
            } catch (error) {
                if (!controller.signal.aborted) setError(error.response?.data?.message || 'Failed to fetch topic details');
            }
        }
        fetchTopic();
        return () => controller.abort();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || (isEditMode && loadedId !== id)) return;
        if (!formData.title.trim()) { setError('Title is required'); return; }
        setLoading(true);
        setError('');

        try {
            if (isEditMode) {
                await topicsApi.put(`/topics/${id}`, formData);
            } else {
                await topicsApi.post('/topics', formData);
            }
            navigate('/topics');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save topic');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <button onClick={() => navigate('/topics')} className="back-btn">
                <ArrowLeft className="icon-sm" />
                Back to Topics
            </button>

            <div className="form-card card">
                <h1 className="form-title">
                    {isEditMode ? 'Edit Topic' : 'Create New Topic'}
                </h1>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="topic-form">
                    <div className="input-group">
                        <label className="input-label">Title</label>
                        <input
                            type="text"
                            required
                            maxLength={200}
                            className="input-field"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Description</label>
                        <textarea
                            rows="4"
                            maxLength={10000}
                            className="input-field textarea-field"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Difficulty</label>
                        <select
                            className="input-field"
                            value={formData.difficulty}
                            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            disabled={loading || (isEditMode && loadedId !== id)}
                            className="btn btn-primary btn-submit"
                        >
                            <Save className="icon-sm" />
                            {loading ? 'Saving...' : isEditMode ? 'Update Topic' : 'Create Topic'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
