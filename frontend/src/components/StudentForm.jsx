import { useEffect, useState } from 'react';
import { useMeta } from '../hooks.js';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  course: '',
  semester: '',
  rollNumber: '',
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const validate = (values) => {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter the student’s full name';
  else if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

  if (!values.email.trim()) errors.email = 'Enter an email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'That email doesn’t look right';

  if (!values.phone.trim()) errors.phone = 'Enter a phone number';
  else if (!/^[0-9+\-\s()]{7,20}$/.test(values.phone)) errors.phone = 'Use 7–20 digits, spaces or + ( ) -';

  if (!values.address.trim()) errors.address = 'Enter an address';

  if (!values.dateOfBirth) errors.dateOfBirth = 'Enter a date of birth';
  else if (new Date(values.dateOfBirth) >= new Date()) errors.dateOfBirth = 'Date must be in the past';

  if (!values.gender) errors.gender = 'Select a gender';
  if (!values.course) errors.course = 'Select a program';
  if (!values.semester) errors.semester = 'Select a semester';
  if (!values.rollNumber.trim()) errors.rollNumber = 'Enter a roll number';

  return errors;
};

// Defined at module scope: a component created inside StudentForm would be a new
// type on every render, remounting the inputs and dropping focus while typing.
const Field = ({ field, label, hint, error, span = 4, children }) => (
  <div className={`field field--${span}`}>
    <label htmlFor={field}>
      {label}
      <span className="req">*</span>
    </label>
    {children}
    {error ? (
      <span className="field-msg is-error">{error}</span>
    ) : (
      hint && <span className="field-msg">{hint}</span>
    )}
  </div>
);

export const StudentForm = ({
  initialValues,
  submitLabel = 'Save',
  busyLabel = 'Saving…',
  busy,
  serverErrors,
  onSubmit,
  onCancel,
}) => {
  const meta = useMeta();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  // Errors stay hidden until the first submit, then track every keystroke.
  // Revealing them on blur instead would reflow the form under the pointer:
  // blurring the last field shifted the submit button out from under a
  // mousedown, so the click never landed.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    setValues({
      ...EMPTY,
      ...initialValues,
      semester: initialValues.semester ? String(initialValues.semester) : '',
      dateOfBirth: toDateInput(initialValues.dateOfBirth),
    });
  }, [initialValues]);

  // Server-side errors (a duplicate email, say) always show; local ones wait.
  const shown = { ...(submitted ? errors : {}), ...(serverErrors || {}) };

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validate(next));
  };

  const handleBlur = () => {
    if (submitted) setErrors(validate(values));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);

    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => document.querySelector('.control.is-invalid')?.focus());
      return;
    }

    onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      rollNumber: values.rollNumber.trim().toUpperCase(),
      semester: Number(values.semester),
    });
  };

  const bind = (field) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: handleChange(field),
    onBlur: handleBlur,
    'aria-invalid': shown[field] ? true : undefined,
    className: `control ${shown[field] ? 'is-invalid' : ''}`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <section className="form-section">
        <div className="form-section__head">
          <h3>Identity</h3>
          <p>As printed on the student&rsquo;s citizenship or passport.</p>
        </div>
        <div className="fields">
          <Field field="name" error={shown.name} span={4} label="Full name">
            <input {...bind('name')} autoComplete="off" placeholder="Sammy Paudyal" />
          </Field>
          <Field field="rollNumber" error={shown.rollNumber} span={3} label="Roll number" hint="College format: SC-2026-001">
            <input {...bind('rollNumber')} autoComplete="off" placeholder="SC-2026-001" />
          </Field>
          <Field field="dateOfBirth" error={shown.dateOfBirth} span={3} label="Date of birth">
            <input {...bind('dateOfBirth')} type="date" max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field field="gender" error={shown.gender} span={2} label="Gender">
            <select {...bind('gender')}>
              <option value="">Select</option>
              {meta.genders.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__head">
          <h3>Contact</h3>
          <p>Used for result notices and fee reminders.</p>
        </div>
        <div className="fields">
          <Field field="email" error={shown.email} span={5} label="Email address">
            <input {...bind('email')} type="email" autoComplete="off" placeholder="name@sunway.edu.np" />
          </Field>
          <Field field="phone" error={shown.phone} span={3} label="Phone number">
            <input {...bind('phone')} autoComplete="off" placeholder="98XXXXXXXX" />
          </Field>
          <Field field="address" error={shown.address} span={8} label="Permanent address">
            <textarea {...bind('address')} rows={2} placeholder="Ward, Municipality, District" />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__head">
          <h3>Enrollment</h3>
          <p>Program and the semester the student is currently sitting.</p>
        </div>
        <div className="fields">
          <Field field="course" error={shown.course} span={4} label="Program">
            <select {...bind('course')}>
              <option value="">Select</option>
              {meta.courses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field field="semester" error={shown.semester} span={3} label="Semester">
            <select {...bind('semester')}>
              <option value="">Select</option>
              {meta.semesters.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="form-foot">
        <span className="note">
          <span style={{ color: 'var(--danger)' }}>*</span> Required
        </span>
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};
