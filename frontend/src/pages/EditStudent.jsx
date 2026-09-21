import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader.jsx';
import { StudentForm } from '../components/StudentForm.jsx';
import { Alert } from '../components/Alert.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconArrowLeft } from '../components/Icons.jsx';
import { fetchStudent, updateStudent } from '../api/students.js';
import { toApiError } from '../api/client.js';

export const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();

  const [student, setStudent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudent(id)
      .then(setStudent)
      .catch((err) => setError(toApiError(err).message));
  }, [id]);

  const handleSubmit = async (values) => {
    setBusy(true);
    setServerErrors({});
    setError('');
    try {
      const updated = await updateStudent(id, values);
      notify(`Record updated for ${updated.name}`);
      navigate(`/students/${id}`);
    } catch (err) {
      const { message, errors } = toApiError(err);
      setServerErrors(errors);
      setError(message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Edit record"
        subtitle={
          student
            ? `${student.name} · ${student.rollNumber}`
            : 'Loading the student record…'
        }
        actions={
          <button className="btn btn--quiet" onClick={() => navigate(-1)}>
            <IconArrowLeft /> Back
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <section className="panel">
        {!student && !error ? (
          <div className="panel-body">
            <div className="fields">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="sk" style={{ height: 56 }} />
              ))}
            </div>
          </div>
        ) : (
          student && (
            <StudentForm
              initialValues={student}
              submitLabel="Save changes"
              busyLabel="Saving…"
              busy={busy}
              serverErrors={serverErrors}
              onSubmit={handleSubmit}
              onCancel={() => navigate(`/students/${id}`)}
            />
          )
        )}
      </section>
    </>
  );
};
