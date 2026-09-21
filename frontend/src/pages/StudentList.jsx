import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconSearch, IconEye, IconEdit, IconTrash, IconUserPlus, IconAlert } from '../components/Icons.jsx';
import { useDebounced, useMeta } from '../hooks.js';
import { fetchStudents, deleteStudent } from '../api/students.js';
import { toApiError } from '../api/client.js';

const PER_PAGE = 10;

const SORTS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'rollNumber', label: 'Roll number' },
  { value: 'semester', label: 'Semester' },
];

export const StudentList = () => {
  const navigate = useNavigate();
  const notify = useToast();
  const meta = useMeta();

  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PER_PAGE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounced(search);
  const filtered = Boolean(debouncedSearch || course || semester);

  // Changing any filter has to send the reader back to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, course, semester, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchStudents({
        search: debouncedSearch,
        course,
        semester,
        sort,
        page,
        limit: PER_PAGE,
      });
      setStudents(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(toApiError(err).message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, course, semester, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setSearch('');
    setCourse('');
    setSemester('');
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(target._id);
      notify(`${target.name} removed from the register`);
      setTarget(null);
      // Stepping back keeps the reader off an empty final page.
      if (students.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      notify(toApiError(err).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Every student on record. Search by name, email or roll number."
        actions={
          <Link to="/students/new" className="btn btn--primary">
            <IconUserPlus /> Register student
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div className="filters">
            <div className="search">
              <IconSearch />
              <input
                className="control"
                type="search"
                placeholder="Search name, email or roll number"
                aria-label="Search students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <span className="filter-sep" />

            <select
              className="control"
              aria-label="Filter by program"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">All programs</option>
              {meta.courses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className="control"
              aria-label="Filter by semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">All semesters</option>
              {meta.semesters.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>

            {filtered && (
              <button className="btn btn--quiet btn--sm" onClick={clearFilters}>
                Clear
              </button>
            )}

            <span className="sort push">
              <label htmlFor="sort">Sort</label>
              <select
                id="sort"
                className="control"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORTS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="panel-body">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="sk" style={{ height: 38, marginBottom: 6 }} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={IconAlert}
            title="Couldn't load the student list"
            message="The server didn't respond. Check that the API and database are running, then try again."
            action={
              <button className="btn" onClick={load}>
                Try again
              </button>
            }
          />
        ) : students.length === 0 ? (
          <EmptyState
            title={filtered ? 'No students match those filters' : 'No students on file'}
            message={
              filtered
                ? 'Check the spelling, or widen the program and semester filters.'
                : 'Register the first student to start building the register.'
            }
            action={
              filtered ? (
                <button className="btn" onClick={clearFilters}>Clear filters</button>
              ) : (
                <Link to="/students/new" className="btn btn--primary">
                  <IconUserPlus /> Register student
                </Link>
              )
            }
          />
        ) : (
          <div className="t-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll no.</th>
                  <th>Program</th>
                  <th>Sem.</th>
                  <th>Phone</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="who">
                        <Avatar name={s.name} />
                        <div>
                          <div className="who-name">{s.name}</div>
                          <div className="who-sub">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono muted">{s.rollNumber}</td>
                    <td><span className="tag tag--accent">{s.course}</span></td>
                    <td className="num">{s.semester}</td>
                    <td className="mono muted">{s.phone}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-icon"
                          title={`View ${s.name}`}
                          aria-label={`View ${s.name}`}
                          onClick={() => navigate(`/students/${s._id}`)}
                        >
                          <IconEye />
                        </button>
                        <button
                          className="btn-icon"
                          title={`Edit ${s.name}`}
                          aria-label={`Edit ${s.name}`}
                          onClick={() => navigate(`/students/${s._id}/edit`)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn-icon is-danger"
                          title={`Delete ${s.name}`}
                          aria-label={`Delete ${s.name}`}
                          onClick={() => setTarget(s)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && students.length > 0 && (
          <div className="panel-foot">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={setPage}
            />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(target)}
        title="Delete this student record?"
        message="The record will be permanently removed from the register. This cannot be undone."
        subject={target?.name}
        subjectNote={target && `${target.rollNumber} · ${target.course}, semester ${target.semester}`}
        confirmLabel="Delete record"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
};
