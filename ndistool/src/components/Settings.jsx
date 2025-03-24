// src/components/Settings.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Settings.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Settings states
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    assessmentReminders: true,
    systemUpdates: true,
  });

  const [displaySettings, setDisplaySettings] = useState({
    darkMode: false,
    compactView: false,
    fontSize: "medium",
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState({
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const userInfo = localStorage.getItem("user");

      if (userInfo) {
        setUser(JSON.parse(userInfo));

        // In a real app, you would fetch user settings from backend
        // For now, we'll simulate it with saved settings in localStorage
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setNotificationSettings(
            parsedSettings.notifications || notificationSettings
          );
          setDisplaySettings(parsedSettings.display || displaySettings);
          setAccessibilitySettings(
            parsedSettings.accessibility || accessibilitySettings
          );
        }
      } else {
        setError("User information not found");
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleDisplayChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDisplaySettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAccessibilityChange = (e) => {
    const { name, checked } = e.target;
    setAccessibilitySettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const saveSettings = () => {
    setSuccess("");
    setError("");

    try {
      // Save to localStorage for demo purposes
      // In a real app, you would send this to your backend API
      const settingsToSave = {
        notifications: notificationSettings,
        display: displaySettings,
        accessibility: accessibilitySettings,
      };

      localStorage.setItem("userSettings", JSON.stringify(settingsToSave));
      setSuccess("Settings saved successfully");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your application preferences and account settings</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-content">
        <div className="settings-section">
          <h2>Notification Settings</h2>
          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onChange={handleNotificationChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Email Notifications</h3>
              <p>
                Receive email notifications about assessment updates and reports
              </p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="assessmentReminders"
                  checked={notificationSettings.assessmentReminders}
                  onChange={handleNotificationChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Assessment Reminders</h3>
              <p>Receive reminders about upcoming or overdue assessments</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="systemUpdates"
                  checked={notificationSettings.systemUpdates}
                  onChange={handleNotificationChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>System Updates</h3>
              <p>Receive notifications about system updates and new features</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Display Settings</h2>
          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="darkMode"
                  checked={displaySettings.darkMode}
                  onChange={handleDisplayChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Dark Mode</h3>
              <p>Switch to dark mode for reduced eye strain</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="compactView"
                  checked={displaySettings.compactView}
                  onChange={handleDisplayChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Compact View</h3>
              <p>Show more information on the screen with reduced spacing</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <select
                name="fontSize"
                value={displaySettings.fontSize}
                onChange={handleDisplayChange}
                className="select-control"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="setting-info">
              <h3>Font Size</h3>
              <p>Adjust the application font size for better readability</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Accessibility Settings</h2>
          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="highContrast"
                  checked={accessibilitySettings.highContrast}
                  onChange={handleAccessibilityChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>High Contrast Mode</h3>
              <p>Increase contrast for better visibility</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="reduceMotion"
                  checked={accessibilitySettings.reduceMotion}
                  onChange={handleAccessibilityChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Reduce Motion</h3>
              <p>Minimize animations and transitions</p>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  name="screenReader"
                  checked={accessibilitySettings.screenReader}
                  onChange={handleAccessibilityChange}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-info">
              <h3>Screen Reader Optimization</h3>
              <p>Optimize the interface for screen readers</p>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={fetchUserProfile}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={saveSettings}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
