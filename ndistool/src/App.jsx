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
import Navbar from "./components/Navbar";
import AssessmentReport from "./components/AssessmentReport";
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
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
