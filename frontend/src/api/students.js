import { client } from './client.js';

export const fetchStudents = async (params) => {
  const { data } = await client.get('/students', { params });
  return data;
};

export const fetchStudent = async (id) => {
  const { data } = await client.get(`/students/${id}`);
  return data.data;
};

export const fetchStats = async () => {
  const { data } = await client.get('/students/stats');
  return data.data;
};

export const fetchMeta = async () => {
  const { data } = await client.get('/students/meta');
  return data.data;
};

export const createStudent = async (payload) => {
  const { data } = await client.post('/students', payload);
  return data.data;
};

export const updateStudent = async (id, payload) => {
  const { data } = await client.put(`/students/${id}`, payload);
  return data.data;
};

export const deleteStudent = async (id) => {
  const { data } = await client.delete(`/students/${id}`);
  return data;
};
