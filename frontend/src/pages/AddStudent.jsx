import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader.jsx';
import { StudentForm } from '../components/StudentForm.jsx';
import { Alert } from '../components/Alert.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconArrowLeft } from '../components/Icons.jsx';
import { createStudent } from '../api/students.js';
import { toApiError } from '../api/client.js';

export const AddStudent = () => {
  const navigate = useNavigate();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setBusy(true);
    setServerErrors({});
    setError('');
    try {
      const student = await createStudent(values);
      notify(`${student.name} added to the register`);
      navigate(`/students/${student._id}`);
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
        title="Register student"
        subtitle="Create a record for a newly enrolled student. Email and roll number must be unique."
        actions={
          <button className="btn btn--quiet" onClick={() => navigate(-1)}>
            <IconArrowLeft /> Back
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <section className="panel">
        <StudentForm
          submitLabel="Register student"
          busyLabel="Registering…"
          busy={busy}
          serverErrors={serverErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/students')}
        />
      </section>
    </>
  );
};
