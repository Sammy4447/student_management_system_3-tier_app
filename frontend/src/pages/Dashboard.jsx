import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { IconUsers, IconBook, IconLayers, IconUserPlus } from '../components/Icons.jsx';
import { fetchStats } from '../api/students.js';
import { toApiError } from '../api/client.js';

const relativeDay = (value) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const RowSkeleton = ({ height = 38 }) => (
  <div className="sk" style={{ height, marginBottom: 6 }} />
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(toApiError(err).message));
  }, []);

  const total = stats?.totalStudents ?? 0;
  // Guard against calling a tie a "lead".
  const peak = Math.max(0, ...(stats?.byCourse.map((c) => c.count) ?? [0]));
  const leaders = stats?.byCourse.filter((c) => c.count === peak && c.count > 0) ?? [];
  const share = total ? Math.round((peak / total) * 100) : 0;
  const maxSem = Math.max(1, ...(stats?.bySemester.map((s) => s.count) ?? [1]));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Enrollment across all programs for the current term."
        actions={
          <button className="btn btn--primary" onClick={() => navigate('/students/new')}>
            <IconUserPlus /> Register student
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-label"><IconUsers /> Students</div>
          <div className="stat-num">{stats ? total : '—'}</div>
          <div className="stat-note">
            {stats ? (
              stats.newThisWeek > 0 ? (
                <><b>+{stats.newThisWeek}</b> registered in the last 7 days</>
              ) : (
                'No new registrations this week'
              )
            ) : (
              'Loading…'
            )}
          </div>
        </div>

        <div className="stat-cell">
          <div className="stat-label"><IconBook /> Programs</div>
          <div className="stat-num">{stats ? stats.totalCourses : '—'}</div>
          <div className="stat-note">
            {stats ? `${stats.activeCourses} with students enrolled` : 'Loading…'}
          </div>
        </div>

        <div className="stat-cell">
          <div className="stat-label"><IconLayers /> Semesters</div>
          <div className="stat-num">{stats ? stats.totalSemesters : '—'}</div>
          <div className="stat-note">Four years, two intakes a year</div>
        </div>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Recent registrations</div>
              <div className="panel-sub">Last five records added to the system</div>
            </div>
            <Link to="/students" className="link">View all students</Link>
          </div>

          {!stats ? (
            <div className="panel-body">
              {[0, 1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}
            </div>
          ) : stats.recentStudents.length === 0 ? (
            <EmptyState
              title="No students on file"
              message="Once you register a student, their record will appear here."
              action={
                <Link to="/students/new" className="btn btn--primary">
                  <IconUserPlus /> Register student
                </Link>
              }
            />
          ) : (
            <div className="t-wrap t-wrap--compact">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Program</th>
                    <th>Semester</th>
                    <th>Roll no.</th>
                    <th className="right">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentStudents.map((s) => (
                    <tr
                      key={s._id}
                      className="is-clickable"
                      onClick={() => navigate(`/students/${s._id}`)}
                    >
                      <td>
                        <div className="who">
                          <Avatar name={s.name} />
                          <div>
                            <div className="who-name">{s.name}</div>
                            <div className="who-sub">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="tag tag--accent">{s.course}</span></td>
                      <td className="num">{s.semester}</td>
                      <td className="mono muted">{s.rollNumber}</td>
                      <td className="right muted">{relativeDay(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Enrollment by program</div>
                <div className="panel-sub">
                  {leaders.length === 1
                    ? `${leaders[0].course} leads with ${share}% of students`
                    : leaders.length > 1
                      ? `${leaders.length} programs tied at ${share}% of students`
                      : 'Share of total students'}
                </div>
              </div>
            </div>
            <div className="panel-body">
              {!stats
                ? [0, 1, 2, 3, 4].map((i) => <RowSkeleton key={i} height={22} />)
                : stats.byCourse.map(({ course, count }) => (
                    <div className="dist-row" key={course}>
                      <span className="dist-name">{course}</span>
                      <div className="dist-track">
                        <div
                          className="dist-bar"
                          style={{ width: total ? `${(count / total) * 100}%` : 0 }}
                        />
                      </div>
                      <span className="dist-val">
                        {count}
                        <span>{total ? `${Math.round((count / total) * 100)}%` : '0%'}</span>
                      </span>
                    </div>
                  ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Students per semester</div>
                <div className="panel-sub">Across every program</div>
              </div>
            </div>
            <div className="panel-body">
              {!stats ? (
                <div className="sk" style={{ height: 96 }} />
              ) : (
                <>
                  <div className="sem-chart">
                    {stats.bySemester.map(({ semester, count }) => (
                      <div
                        key={semester}
                        className={`sem-col ${count === maxSem && count > 0 ? 'is-top' : ''}`}
                        style={{ height: `${Math.max((count / maxSem) * 100, 3)}%` }}
                        title={`Semester ${semester}: ${count} student${count === 1 ? '' : 's'}`}
                      />
                    ))}
                  </div>
                  <div className="sem-axis">
                    {stats.bySemester.map(({ semester }) => (
                      <span key={semester}>{semester}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
