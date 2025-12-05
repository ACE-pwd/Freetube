import axios from 'axios';

const AUTH_URL = 'https://freetube-1.onrender.com';
const TOPICS_URL = 'https://freetube-1.onrender.com/api';

export const authApi = axios.create({
    baseURL: AUTH_URL,
});

export const topicsApi = axios.create({
    baseURL: TOPICS_URL,
});

topicsApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth functions matching Freetube's signature
export async function loginUser(email, password) {
    try {
        const response = await authApi.post('/login', { email, password });
        return response.data;
    } catch (error) {
        return error.response?.data || { message: 'Login failed' };
    }
}

export async function signupUser(name, email, password) {
    try {
        const response = await authApi.post('/signup', { name, email, password });
        return response.data;
    } catch (error) {
        return error.response?.data || { message: 'Signup failed' };
    }
}
