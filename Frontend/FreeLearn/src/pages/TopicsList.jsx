import { sessionToken } from '../session';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { topicsApi } from '../api';
import { Search, Filter, Calendar, Edit, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import './TopicsList.css';

export default function TopicsList() {
    const [topics, setTopics] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [sort, setSort] = useState('date_newest');
    const [page, setPage] = useState(1);

    const token = sessionToken();

    useEffect(() => {
        const controller = new AbortController();
        async function fetchTopics() {
            setLoading(true);
            setError('');
            try {
                const params = { page, limit: 5, search, difficulty, sort };
                const response = await topicsApi.get('/topics', { params, signal: controller.signal });
                if (controller.signal.aborted) return;
                setTopics(response.data.topics);
                setPagination(response.data.pagination);
                setPage(response.data.pagination.currentPage);
            } catch (error) {
                if (!controller.signal.aborted) setError(error.response?.data?.message || 'Unable to load topics. Please try again.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        fetchTopics();
        return () => controller.abort();
    }, [page, search, difficulty, sort, revision]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this topic?')) return;
        try {
            await topicsApi.delete(`/topics/${id}`);
            setRevision(value => value + 1);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to delete topic');
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleDifficultyChange = (e) => {
        setDifficulty(e.target.value);
        setPage(1);
    };

    const handleSortChange = (e) => {
        setSort(e.target.value);
        setPage(1);
    };

    const getDifficultyClass = (diff) => {
        switch (diff) {
            case 'easy': return 'badge-easy';
            case 'medium': return 'badge-medium';
            case 'hard': return 'badge-hard';
            default: return 'badge-default';
        }
    };

    return (
        <div className="topics-container">
            <div className="topics-header">
                <h1 className="topics-title">Topics Library</h1>
                {token && (
                    <Link to="/topics/new" className="btn btn-primary">
                        <Plus className="icon-sm" />
                        Create Topic
                    </Link>
                )}
            </div>

            {/* Filters Bar */}
            <div className="filters-bar card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search topics..."
                        className="search-input"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>

                <div className="filter-select-wrapper">
                    <Filter className="filter-icon" />
                    <select
                        className="filter-select"
                        value={difficulty}
                        onChange={handleDifficultyChange}
                    >
                        <option value="">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div className="sort-select-wrapper">
                    <select
                        className="sort-select"
                        value={sort}
                        onChange={handleSortChange}
                    >
                        <option value="date_newest">Newest First</option>
                        <option value="date_oldest">Oldest First</option>
                        <option value="title_asc">Title (A-Z)</option>
                        <option value="title_desc">Title (Z-A)</option>
                    </select>
                </div>
            </div>

            {error && <div className="error-message" role="alert">{error} <button className="btn btn-outline" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}

            {/* List */}
            <div className="topics-list">
                {loading ? (
                    <div className="loading-state">Loading topics...</div>
                ) : error ? null : topics.length === 0 ? (
                    <div className="empty-state card">
                        <p>No topics found matching your criteria.</p>
                    </div>
                ) : (
                    topics.map((topic) => (
                        <div key={topic.id} className="topic-card card">
                            <div className="topic-content">
                                <div className="topic-header-row">
                                    <h3 className="topic-title">{topic.title}</h3>
                                    <span className={`badge ${getDifficultyClass(topic.difficulty)}`}>
                                        {topic.difficulty ? topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1) : 'Not specified'}
                                    </span>
                                </div>
                                <p className="topic-description">{topic.description}</p>
                                <div className="topic-date">
                                    <Calendar className="icon-sm" />
                                    {new Date(topic.createdAt.includes('T') ? topic.createdAt : topic.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString()}
                                </div>
                            </div>

                            {token && (
                                <div className="topic-actions">
                                    <Link to={`/topics/${topic.id}/edit`} aria-label={`Edit ${topic.title}`} className="action-btn action-btn-edit">
                                        <Edit className="icon-sm" />
                                    </Link>
                                    <button onClick={() => handleDelete(topic.id)} aria-label={`Delete ${topic.title}`} className="action-btn action-btn-delete">
                                        <Trash2 className="icon-sm" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        aria-label="Previous page"
                        disabled={page === 1}
                        className="pagination-btn"
                    >
                        <ChevronLeft className="icon-sm" />
                    </button>
                    <span className="pagination-text">
                        Page {page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        aria-label="Next page"
                        disabled={page === pagination.totalPages}
                        className="pagination-btn"
                    >
                        <ChevronRight className="icon-sm" />
                    </button>
                </div>
            )}
        </div>
    );
}
