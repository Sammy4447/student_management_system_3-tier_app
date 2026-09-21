import { IconAlert } from './Icons.jsx';

export const Alert = ({ children }) => (
  <div className="alert" role="alert">
    <IconAlert />
    <span>{children}</span>
  </div>
);
