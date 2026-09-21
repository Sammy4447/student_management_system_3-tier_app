import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Alert } from '../components/Alert.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconArrowLeft, IconEdit, IconTrash } from '../components/Icons.jsx';
import { fetchStudent, deleteStudent } from '../api/students.js';
import { toApiError } from '../api/client.js';

const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();

  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStudent(id)
      .then(setStudent)
      .catch((err) => setError(toApiError(err).message));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(id);
      notify(`${student.name} removed from the register`);
      navigate('/students');
    } catch (err) {
      notify(toApiError(err).message, 'error');
      setDeleting(false);
      setConfirming(false);
    }
  };

  const groups = student && [
    {
      title: 'Contact',
      items: [
        { term: 'Email', value: <a href={`mailto:${student.email}`}>{student.email}</a> },
        { term: 'Phone', value: <a href={`tel:${student.phone}`} className="mono">{student.phone}</a> },
        { term: 'Permanent address', value: student.address },
      ],
    },
    {
      title: 'Academic',
      items: [
        { term: 'Program', value: student.course },
        { term: 'Semester', value: `Semester ${student.semester} of 8` },
        { term: 'Roll number', value: <span className="mono">{student.rollNumber}</span> },
      ],
    },
    {
      title: 'Personal',
      items: [
        { term: 'Date of birth', value: longDate(student.dateOfBirth) },
        { term: 'Age', value: student.age != null ? `${student.age} years` : '—' },
        { term: 'Gender', value: student.gender },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Student record"
        subtitle="Full details held by the Registrar's Office."
        actions={
          <>
            <button className="btn btn--quiet" onClick={() => navigate('/students')}>
              <IconArrowLeft /> All students
            </button>
            {student && (
              <>
                <button className="btn" onClick={() => navigate(`/students/${id}/edit`)}>
                  <IconEdit /> Edit
                </button>
                <button className="btn btn--danger" onClick={() => setConfirming(true)}>
                  <IconTrash /> Delete
                </button>
              </>
            )}
          </>
        }
      />

      {error && <Alert>{error}</Alert>}

      {!student && !error && (
        <div className="panel">
          <div className="panel-body">
            <div className="sk" style={{ height: 60, marginBottom: 14 }} />
            <div className="sk" style={{ height: 180 }} />
          </div>
        </div>
      )}

      {student && (
        <div className="split">
          <section className="panel">
            <div className="record-head">
              <Avatar name={student.name} size="lg" />
              <div>
                <h2>{student.name}</h2>
                <div className="record-meta">
                  <span className="tag tag--accent">{student.course}</span>
                  <span className="tag">Semester {student.semester}</span>
                  <span className="tag tag--mono">{student.rollNumber}</span>
                </div>
              </div>
            </div>

            {groups.map(({ title, items }) => (
              <div className="rec-group" key={title}>
                <div className="rec-group__title">{title}</div>
                <dl className="dl">
                  {items.map(({ term, value }) => (
                    <div className="dl-item" key={term}>
                      <dt>{term}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Record history</div>
            </div>
            <div className="panel-body">
              <dl style={{ margin: 0 }}>
                <div className="meta-row">
                  <dt>Registered</dt>
                  <dd>{dateTime(student.createdAt)}</dd>
                </div>
                <div className="meta-row">
                  <dt>Last updated</dt>
                  <dd>{dateTime(student.updatedAt)}</dd>
                </div>
                <div className="meta-row">
                  <dt>Record ID</dt>
                  <dd className="mono">{student._id}</dd>
                </div>
              </dl>
            </div>
            <div className="panel-foot">
              <button className="btn btn--sm" onClick={() => navigate(`/students/${id}/edit`)}>
                <IconEdit /> Edit this record
              </button>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete this student record?"
        message="The record will be permanently removed from the register. This cannot be undone."
        subject={student?.name}
        subjectNote={student && `${student.rollNumber} · ${student.course}, semester ${student.semester}`}
        confirmLabel="Delete record"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};
