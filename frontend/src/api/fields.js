import { useState, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export function useFields(user) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API_BASE}/fields`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    .then(r => r.json())
    .then(d => {
      setData(d.data || []);
      setLoading(false);
    })
    .catch(e => {
      setError(e);
      setLoading(false);
    });
  }, [user]);

  return { data, loading, error };
}

export function useFieldEndpoint(user, fieldId, endpoint) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !fieldId || fieldId === 'all') {
      setData(null);
      setLoading(false);
      return;
    }
    let abortController = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/fields/${fieldId}/${endpoint}`, {
      headers: { Authorization: `Bearer ${user.token}` },
      signal: abortController.signal
    })
    .then(r => r.json())
    .then(d => {
      setData(d.data);
      setMeta(d.meta);
      setLoading(false);
    })
    .catch(e => {
      if (e.name !== 'AbortError') {
        setError(e);
        setLoading(false);
      }
    });
    return () => abortController.abort();
  }, [user, fieldId, endpoint]);

  return { data, meta, loading, error };
}
