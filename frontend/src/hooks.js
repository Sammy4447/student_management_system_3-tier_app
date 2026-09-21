import { useEffect, useState } from 'react';
import { fetchMeta } from './api/students.js';

const FALLBACK = {
  courses: ['BCA', 'BIT', 'BBA', 'BSc CSIT', 'BBM'],
  genders: ['Male', 'Female', 'Other'],
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
};

// Course/gender/semester options come from the API so the two sides never drift.
export const useMeta = () => {
  const [meta, setMeta] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    fetchMeta()
      .then((data) => alive && setMeta(data))
      .catch(() => {}); // fallback already in state
    return () => {
      alive = false;
    };
  }, []);

  return meta;
};

export const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
};
