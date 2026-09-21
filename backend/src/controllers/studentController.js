import { Student, COURSES, GENDERS, MAX_SEMESTER } from '../models/Student.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EDITABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'dateOfBirth',
  'gender',
  'course',
  'semester',
  'rollNumber',
];

const pickFields = (body) =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]])
  );

// GET /api/students?search=&course=&semester=&page=&limit=&sort=
export const getStudents = asyncHandler(async (req, res) => {
  const { search = '', course = '', semester = '', sort = '-createdAt' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const filter = {};

  if (search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { rollNumber: rx }];
  }
  if (course) filter.course = course;
  if (semester) filter.semester = Number(semester);

  const [students, total] = await Promise.all([
    Student.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: students,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

// GET /api/students/:id
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  res.json({ success: true, data: student });
});

// POST /api/students
export const createStudent = asyncHandler(async (req, res) => {
  const student = await Student.create(pickFields(req.body));
  res.status(201).json({ success: true, message: 'Student registered successfully', data: student });
});

// PUT /api/students/:id
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, pickFields(req.body), {
    new: true,
    runValidators: true,
    context: 'query',
  });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  res.json({ success: true, message: 'Student updated successfully', data: student });
});

// DELETE /api/students/:id
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  res.json({ success: true, message: 'Student deleted successfully', data: { id: student.id } });
});

// GET /api/students/stats  -> dashboard cards + charts + recent students
export const getStats = asyncHandler(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalStudents, newThisWeek, byCourse, bySemester, recentStudents] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ createdAt: { $gte: weekAgo } }),
    Student.aggregate([{ $group: { _id: '$course', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Student.aggregate([{ $group: { _id: '$semester', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Student.find().sort('-createdAt').limit(5).lean(),
  ]);

  res.json({
    success: true,
    data: {
      totalStudents,
      newThisWeek,
      totalCourses: COURSES.length,
      totalSemesters: MAX_SEMESTER,
      activeCourses: byCourse.length,
      byCourse: COURSES.map((c) => ({
        course: c,
        count: byCourse.find((b) => b._id === c)?.count ?? 0,
      })),
      bySemester: Array.from({ length: MAX_SEMESTER }, (_, i) => ({
        semester: i + 1,
        count: bySemester.find((b) => b._id === i + 1)?.count ?? 0,
      })),
      recentStudents,
    },
  });
});

// GET /api/students/meta -> dropdown options for the frontend forms
export const getMeta = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      courses: COURSES,
      genders: GENDERS,
      semesters: Array.from({ length: MAX_SEMESTER }, (_, i) => i + 1),
    },
  });
});
