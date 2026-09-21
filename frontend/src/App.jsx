import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { StudentList } from './pages/StudentList.jsx';
import { StudentDetails } from './pages/StudentDetails.jsx';
import { AddStudent } from './pages/AddStudent.jsx';
import { EditStudent } from './pages/EditStudent.jsx';
import { NotFound } from './pages/NotFound.jsx';

const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<StudentList />} />
          <Route path="students/new" element={<AddStudent />} />
          <Route path="students/:id" element={<StudentDetails />} />
          <Route path="students/:id/edit" element={<EditStudent />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
