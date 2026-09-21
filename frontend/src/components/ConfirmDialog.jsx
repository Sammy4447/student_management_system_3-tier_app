import { useEffect, useRef } from 'react';

export const ConfirmDialog = ({
  open,
  title,
  message,
  subject,
  subjectNote,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="scrim"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-body">
          <h3>{title}</h3>
          <p>{message}</p>
          {subject && (
            <div className="subject">
              {subject}
              {subjectNote && <span>{subjectNote}</span>}
            </div>
          )}
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            className="btn btn--danger-solid"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
