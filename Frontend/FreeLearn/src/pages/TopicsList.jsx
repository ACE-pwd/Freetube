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

    // Filters
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [sort, setSort] = useState('date_newest');
    const [page, setPage] = useState(1);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchTopics();
    }, [page, search, difficulty, sort]);

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 5, search, difficulty, sort };
            const response = await topicsApi.get('/topics', { params });
            setTopics(response.data.topics);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this topic?')) return;
        try {
            await topicsApi.delete(`/topics/${id}`);
            fetchTopics();
        } catch (error) {
            alert('Failed to delete topic');
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

            {/* List */}
            <div className="topics-list">
                {loading ? (
                    <div className="loading-state">Loading topics...</div>
                ) : topics.length === 0 ? (
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
                                        {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                                    </span>
                                </div>
                                <p className="topic-description">{topic.description}</p>
                                <div className="topic-date">
                                    <Calendar className="icon-sm" />
                                    {new Date(topic.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            {token && (
                                <div className="topic-actions">
                                    <Link to={`/topics/${topic.id}/edit`} className="action-btn action-btn-edit">
                                        <Edit className="icon-sm" />
                                    </Link>
                                    <button onClick={() => handleDelete(topic.id)} className="action-btn action-btn-delete">
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
