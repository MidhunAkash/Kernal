import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import FindExpert from './pages/FindExpert';
import JobsListing from './pages/JobsListing';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';

const Shell = () => {
  const location = useLocation();
  const hideHeader = location.pathname === '/login' || location.pathname === '/register';
  return (
    <>
      {!hideHeader && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<FindExpert />} />
          <Route path="/jobs" element={<JobsListing />} />
          <Route path="/jobs/:jobId" element={<JobDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
