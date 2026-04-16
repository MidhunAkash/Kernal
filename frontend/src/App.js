import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';
import FindExpert from './pages/FindExpert';
import JobsListing from './pages/JobsListing';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';

const PublicOnly = ({ children }) => {
  const isAuthed =
    typeof window !== 'undefined' && localStorage.getItem('kernel_auth') === 'true';
  if (isAuthed) return <Navigate to="/" replace />;
  return children;
};

const Shell = () => {
  const location = useLocation();
  const hideHeader = location.pathname === '/login' || location.pathname === '/register';
  return (
    <>
      {!hideHeader && <Header />}
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <FindExpert />
              </PrivateRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <PrivateRoute>
                <JobsListing />
              </PrivateRoute>
            }
          />
          <Route
            path="/jobs/:jobId"
            element={
              <PrivateRoute>
                <JobDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

export default App;
