import { IconInbox } from './Icons.jsx';

export const EmptyState = ({ title, message, action, icon: Icon = IconInbox }) => (
  <div className="empty">
    <Icon />
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action}
  </div>
);
