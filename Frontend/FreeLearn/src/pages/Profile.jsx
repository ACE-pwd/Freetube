import { useEffect, useState } from 'react';
import { authApi } from '../api';
import { User, Mail, Shield } from 'lucide-react';
import './Profile.css';

export default function Profile() {
    const [email, setEmail] = useState(localStorage.getItem('email'));
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        authApi.get('/me', { signal: controller.signal }).then(({ data }) => {
            if (controller.signal.aborted) return;
            setEmail(data.email);
            localStorage.setItem('email', data.email);
        }).catch(error => {
            if (!controller.signal.aborted) setError(error.response?.data?.message || 'Unable to load profile. Please refresh to try again.');
        });
        return () => controller.abort();
    }, []);

    return (
        <div className="profile-container">
            <h1 className="profile-title">My Profile</h1>

            {error && <div className="error-message" role="alert">{error}</div>}
            <div className="profile-card card">
                <div className="profile-header"></div>
                <div className="profile-body">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar">
                            <User className="avatar-icon" />
                        </div>
                    </div>

                    <div className="profile-info">
                        <div className="info-item">
                            <label className="info-label">Email Address</label>
                            <div className="info-value">
                                <Mail className="icon-sm info-icon" />
                                {email}
                            </div>
                        </div>

                        <div className="info-divider"></div>

                        <div className="info-item">
                            <label className="info-label">Account Status</label>
                            <div className="status-badge">
                                <Shield className="icon-sm" />
                                Active Member
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
