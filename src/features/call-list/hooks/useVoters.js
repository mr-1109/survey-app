'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVoters, patchFeedback } from '../api/voters';
import { PAGE_SIZE } from '../constants';

/**
 * Owns the voter list for the current filters. The page never asks for more
 * than `limit` rows; "और देखें" raises the limit by one page.
 */
export function useVoters({ bhag, kshetra, feedback, q, pageSize = PAGE_SIZE }) {
  const [voters, setVoters] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(pageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // A filter change — or a new page size from settings — restarts paging.
  useEffect(() => {
    setLimit(pageSize);
  }, [bhag, kshetra, feedback, q, pageSize]);

  const abortRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetchVoters({ bhag, kshetra, feedback, q, limit }, controller.signal)
      .then((data) => {
        setVoters(data.voters);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setVoters([]);
        setHasMore(false);
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [bhag, kshetra, feedback, q, limit]);

  const showMore = useCallback(() => setLimit((n) => n + pageSize), [pageSize]);

  /** Optimistic write — roll the card back to its previous value on failure. */
  const setFeedback = useCallback(async (vlistid, value) => {
    let previous;
    setVoters((rows) =>
      rows.map((row) => {
        if (row.VLISTID !== vlistid) return row;
        previous = row.FEEDBACK_STATUS;
        return { ...row, FEEDBACK_STATUS: value };
      }),
    );

    try {
      await patchFeedback(vlistid, value);
    } catch (err) {
      setVoters((rows) =>
        rows.map((row) =>
          row.VLISTID === vlistid ? { ...row, FEEDBACK_STATUS: previous ?? null } : row,
        ),
      );
      setError(err.message);
    }
  }, []);

  return {
    voters,
    hasMore,
    loading,
    error,
    showMore,
    setFeedback,
    clearError: useCallback(() => setError(null), []),
  };
}
