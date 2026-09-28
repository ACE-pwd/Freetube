import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '';
const TOPICS_URL = import.meta.env.VITE_TOPICS_URL || '/api';

export const authApi = axios.create({
    baseURL: AUTH_URL,
    timeout: 15000,
});

export const topicsApi = axios.create({
    baseURL: TOPICS_URL,
    timeout: 15000,
});

for (const api of [authApi, topicsApi]) {
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    api.interceptors.response.use(response => response, error => {
        if (error.response?.status === 401 && localStorage.getItem('token') &&
            !['/login', '/signup'].includes(error.config?.url)) {
            localStorage.removeItem('token');
            localStorage.removeItem('email');
            window.location.assign('/login');
        }
        return Promise.reject(error);
    });
}

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
