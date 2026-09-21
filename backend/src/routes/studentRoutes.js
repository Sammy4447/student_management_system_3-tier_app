import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStats,
  getMeta,
} from '../controllers/studentController.js';

const router = Router();

// Static routes first so they are not swallowed by /:id
router.get('/stats', getStats);
router.get('/meta', getMeta);

router.route('/').get(getStudents).post(createStudent);
router.route('/:id').get(getStudentById).put(updateStudent).delete(deleteStudent);

export default router;
