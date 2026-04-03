const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request(url: string, options?: RequestInit) {
    const res = await fetch(`${BASE_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    return res.json();
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export async function fetchTables() {
    const data = await request('/tables');
    return data.tables || [];
}

// ─── Query ───────────────────────────────────────────────────────────────────

export async function executeQuery(sql: string) {
    return request('/query', {
        method: 'POST',
        body: JSON.stringify({ sql }),
    });
}

export async function getQueryPlan(sql: string) {
    const data = await request('/query/plan', {
        method: 'POST',
        body: JSON.stringify({ sql }),
    });
    return data.plan || null;
}

// ─── Indexes ─────────────────────────────────────────────────────────────────

export async function fetchIndexes(tableName: string) {
    const data = await request(`/indexes?table=${encodeURIComponent(tableName)}`);
    return {
        bTreeIndexes: data.bTreeIndexes || [],
        hashIndexes: data.hashIndexes || [],
    };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function fetchTransactions() {
    const data = await request('/transactions');
    return {
        transactions: data.transactions || [],
        activeTransaction: data.activeTransaction || null,
    };
}

export async function beginTransaction() {
    return request('/transactions/begin', { method: 'POST' });
}

export async function commitTransaction() {
    return request('/transactions/commit', { method: 'POST' });
}

export async function rollbackTransaction() {
    return request('/transactions/rollback', { method: 'POST' });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function fetchStorage() {
    const data = await request('/storage');
    return {
        stats: data.stats || {
            totalPages: 0,
            usedPages: 0,
            pageSize: 4,
            bufferPoolSize: 100,
            bufferPoolUsed: 0,
            totalRecords: 0,
        },
        dataFiles: data.dataFiles || [],
    };
}
