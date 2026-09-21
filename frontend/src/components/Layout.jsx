import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { client } from '../api/client.js';
import { IconGrid, IconUsers, IconUserPlus, IconBook, IconLayers, IconMenu } from './Icons.jsx';

// `isActive` is computed per item: NavLink alone would light up both
// "Students" and "Register student" while on /students/new.
const PRIMARY = [
  { to: '/', label: 'Dashboard', icon: IconGrid, match: (p) => p === '/' },
  {
    to: '/students',
    label: 'Students',
    icon: IconUsers,
    match: (p) => p.startsWith('/students') && p !== '/students/new',
  },
  {
    to: '/students/new',
    label: 'Register student',
    icon: IconUserPlus,
    match: (p) => p === '/students/new',
  },
];

const PLANNED = [
  { label: 'Programs', icon: IconBook },
  { label: 'Transcripts', icon: IconLayers },
];

// Breadcrumbs are derived from the path so they never drift from the router.
const crumbsFor = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Dashboard' }];

  const crumbs = [{ label: 'Students', to: '/students' }];
  if (parts.length === 1) return crumbs;
  if (parts[1] === 'new') return [...crumbs, { label: 'Register' }];

  crumbs.push({ label: 'Profile', to: `/students/${parts[1]}` });
  if (parts[2] === 'edit') crumbs.push({ label: 'Edit' });
  return crumbs;
};

const useApiStatus = () => {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let alive = true;
    const ping = () =>
      client
        .get('/health')
        .then(() => alive && setOnline(true))
        .catch(() => alive && setOnline(false));

    ping();
    const id = setInterval(ping, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return online;
};

export const Layout = () => {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const apiOnline = useApiStatus();
  const crumbs = crumbsFor(pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="topbar">
        <button
          className="btn-icon menu-btn"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
        >
          <IconMenu />
        </button>

        <Link to="/" className="tb-brand">
          <span className="tb-mark">S</span>
          <span className="tb-name">Sunway Registrar</span>
        </Link>

        <span className="tb-div" />

        <nav className="tb-crumbs" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={crumb.label} style={{ display: 'contents' }}>
              {i > 0 && <span className="sep">/</span>}
              {crumb.to && i < crumbs.length - 1 ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span className="here">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="tb-right">
          <span className="term" title="Active academic term">
            <span className="dot" />
            Fall 2026
          </span>
          <span className="user">
            <span className="user-init">RO</span>
            <span className="user-meta">
              <strong>Registrar's Office</strong>
              <span>Full access</span>
            </span>
          </span>
        </div>
      </header>

      <div className="shell">
        <aside className={`sidebar ${navOpen ? 'is-open' : ''}`}>
          <div className="side-group">
            <div className="side-label">Records</div>
            {PRIMARY.map(({ to, label, icon: Icon, match }) => (
              <Link
                key={to}
                to={to}
                className={`side-item ${match(pathname) ? 'active' : ''}`}
                aria-current={match(pathname) ? 'page' : undefined}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </div>

          <div className="side-group">
            <div className="side-label">Academics</div>
            {PLANNED.map(({ label, icon: Icon }) => (
              <span key={label} className="side-item is-soon" aria-disabled="true">
                <Icon />
                {label}
                <span className="side-soon">Soon</span>
              </span>
            ))}
          </div>

          <div className="side-note">
            <strong>Enrollment window</strong>
            Fall 2026 registration closes 14 Oct. Late entries need approval from the
            Academic Director.
          </div>
        </aside>

        {navOpen && <div className="backdrop" onClick={() => setNavOpen(false)} />}

        <div className="content">
          <div className="content-inner">
            <div key={pathname} className="view">
              <Outlet />
            </div>
          </div>

          <footer className="footer">
            <span>&copy; 2026 Sunway College &middot; Registrar's Office</span>
            <div className="right">
              <span
                className={`status ${
                  apiOnline === null ? 'is-checking' : apiOnline ? '' : 'is-down'
                }`}
              >
                {apiOnline === null ? 'Checking API' : apiOnline ? 'API online' : 'API unreachable'}
              </span>
              <span className="tb-div" />
              <span className="mono">v1.0.0</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};
