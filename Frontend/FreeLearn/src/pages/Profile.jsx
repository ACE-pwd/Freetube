import { User, Mail, Shield } from 'lucide-react';
import './Profile.css';

export default function Profile() {
    const email = localStorage.getItem('email');

    return (
        <div className="profile-container">
            <h1 className="profile-title">My Profile</h1>

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
