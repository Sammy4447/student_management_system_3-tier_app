import { createContext, useCallback, useContext, useState } from 'react';
import { IconCheck, IconAlert } from './Icons.jsx';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => (
          <div key={id} className={`toast ${type === 'error' ? 'is-error' : ''}`}>
            {type === 'error' ? <IconAlert /> : <IconCheck />}
            <span>{message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
