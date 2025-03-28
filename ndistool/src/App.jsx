import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AssessmentForm from "./components/AssessmentForm";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import AssessmentHistory from "./components/AssessmentHistory";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import Navbar from "./components/Navbar";
import ConditionalFooter from "./components/ConditionalFooter";
import AssessmentReport from "./components/AssessmentReport";
import Participants from "./components/Participants";
import ParticipantProfile from "./components/ParticipantProfile";
import Assignments from "./components/Assignments";
import AssignmentDetail from "./components/AssignmentDetail";
import CreateAssignment from "./components/CreateAssignment";
import AdminDashboard from "./components/AdminDashboard";
import ManageSections from "./components/ManageSections";
import ManageUsers from "./components/ManageUsers";
import ParticipantAssessment from "./components/ParticipantAssessment";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <AssessmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/new/:participantId"
              element={
                <ProtectedRoute>
                  <AssessmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AssessmentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/:assessmentId"
              element={
                <ProtectedRoute>
                  <AssessmentReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            {/* New routes for participants */}
            <Route
              path="/participants"
              element={
                <ProtectedRoute>
                  <Participants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participants/:id"
              element={
                <ProtectedRoute>
                  <ParticipantProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participants/:id/assessments"
              element={
                <ProtectedRoute>
                  <AssessmentHistory />
                </ProtectedRoute>
              }
            />
            {/* New routes for assignments */}
            <Route
              path="/assignments"
              element={
                <ProtectedRoute>
                  <Assignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/create"
              element={
                <ProtectedRoute>
                  <CreateAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/:id"
              element={
                <ProtectedRoute>
                  <AssignmentDetail />
                </ProtectedRoute>
              }
            />
            {/* Participant assessment taking route */}
            <Route
              path="/take-assessment/:assignmentId/:assessmentId"
              element={
                <ProtectedRoute>
                  <ParticipantAssessment />
                </ProtectedRoute>
              }
            />
            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sections"
              element={
                <ProtectedRoute>
                  <ManageSections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <ConditionalFooter />
      </div>
    </Router>
  );
}

export default App;
