import { useEffect, useState } from 'react';
import { authApi } from './api';
import { sessionToken } from './session';
export default function useAccount() {
    const [state, setState] = useState({ account: null, loading: Boolean(sessionToken()), error: '' });
    useEffect(() => {
        if (!sessionToken()) return;
        const controller = new AbortController();
        authApi.get('/me', { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setState({ account: data, loading: false, error: '' });
        }).catch(error => {
            if (!controller.signal.aborted) setState({ account: null, loading: false, error: error.response?.data?.message || 'Unable to load account. Please refresh.' });
        });
        return () => controller.abort();
    }, []);
    return state;
}
