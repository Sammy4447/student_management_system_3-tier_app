import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { Student, COURSES, GENDERS } from './models/Student.js';

const FIRST = ['Sammy', 'Rahul', 'Amit', 'Priya', 'Sita', 'Bikash', 'Anjali', 'Nabin', 'Sneha', 'Rohan',
  'Kiran', 'Manish', 'Pooja', 'Suraj', 'Nisha', 'Deepak', 'Aarati', 'Sunil', 'Bibek', 'Rita'];
const LAST = ['Paudyal', 'Sharma', 'Thapa', 'Gurung', 'Shrestha', 'Karki', 'Adhikari', 'Rai', 'Magar', 'Bhattarai'];
const CITY = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Butwal', 'Chitwan', 'Dharan', 'Biratnagar'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildStudents = (count) =>
  Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const year = randInt(1998, 2006);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@sunway.edu.np`,
      phone: `98${randInt(10000000, 99999999)}`,
      address: `${pick(CITY)}, Nepal`,
      dateOfBirth: new Date(year, randInt(0, 11), randInt(1, 28)),
      gender: pick(GENDERS),
      course: pick(COURSES),
      semester: randInt(1, 8),
      rollNumber: `SC-${year}-${String(i + 1).padStart(3, '0')}`,
    };
  });

const run = async () => {
  await connectDB();
  await Student.deleteMany({});
  const students = await Student.insertMany(buildStudents(40));
  console.log(`Seeded ${students.length} students.`);
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
