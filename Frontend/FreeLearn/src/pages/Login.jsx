import React, { useState } from "react";
import { loginUser } from "../api.js";
import "./login.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await loginUser(email, password);
            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("email", data.email); // Added email storage
                setMessage("Login successful!");
                window.location.href = "/dashboard"; // Redirect
            } else {
                setMessage(data.message || "Login failed");
            }
        } catch (error) {
            setMessage("Login failed");
        }
    };

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="login-button">Login</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
}
