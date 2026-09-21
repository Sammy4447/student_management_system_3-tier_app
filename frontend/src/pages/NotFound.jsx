import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { IconAlert } from '../components/Icons.jsx';

export const NotFound = () => (
  <section className="panel">
    <EmptyState
      icon={IconAlert}
      title="Page not found"
      message="That address doesn't match anything in the registrar console."
      action={<Link to="/" className="btn">Back to dashboard</Link>}
    />
  </section>
);
