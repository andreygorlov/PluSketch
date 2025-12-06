import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useProjectStore } from '../../store';
import ProjectList from '../../pages/ProjectList';
import ProjectEditor from './ProjectEditor';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectList />} />
      <Route path="/project/:projectId" element={<ProjectEditor />} />
      <Route path="/project/new" element={<ProjectEditor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
