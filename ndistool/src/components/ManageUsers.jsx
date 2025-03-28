// src/components/ManageUsers.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
// import "../styles/ManageUsers.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    search: "",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    organization: "",
    position: "",
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "assessor",
    organization: "",
    position: "",
    ndisNumber: "",
    dateOfBirth: "",
    contactNumber: "",
    address: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", 10);

      if (filters.role) {
        params.append("role", filters.role);
      }

      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await axios.get(
        `${API_URL}/api/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError("Failed to load users. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("An error occurred while fetching the users.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const resetFilters = () => {
    setFilters({
      role: "",
      search: "",
    });
    setCurrentPage(1);
  };

  const handleEditUser = (userId) => {
    const user = users.find((u) => u._id === userId);
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || "",
        position: user.position || "",
      });
      setEditingUserId(userId);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveUser = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Name and email are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/users/${editingUserId}`,
        editForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update user in state
        setUsers((prev) =>
          prev.map((user) =>
            user._id === editingUserId ? { ...user, ...editForm } : user
          )
        );
        setSuccess("User updated successfully");
        setEditingUserId(null);
        setEditForm({
          name: "",
          email: "",
          role: "",
          organization: "",
          position: "",
        });
      } else {
        setError("Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while updating the user"
      );
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      setError("Name, email, and password are required");
      return;
    }

    // Additional validation for participants
    if (newUser.role === "participant") {
      if (!newUser.ndisNumber.trim()) {
        setError("NDIS number is required for participants");
        return;
      }
      if (!newUser.dateOfBirth) {
        setError("Date of birth is required for participants");
        return;
      }
    } else {
      // Organization is required for non-participants
      if (!newUser.organization.trim()) {
        setError("Organization is required");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/api/users`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        // Add new user to state and reset form
        fetchUsers(); // Refresh the list to get the new user
        setSuccess("User added successfully");
        setShowAddUser(false);
        setNewUser({
          name: "",
          email: "",
          password: "",
          role: "assessor",
          organization: "",
          position: "",
          ndisNumber: "",
          dateOfBirth: "",
          contactNumber: "",
          address: "",
        });
      } else {
        setError("Failed to add user");
      }
    } catch (err) {
      console.error("Error adding user:", err);
      setError(
        err.response?.data?.message || "An error occurred while adding the user"
      );
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Remove user from state
        setUsers((prev) => prev.filter((user) => user._id !== userId));
        setSuccess("User deleted successfully");
      } else {
        setError("Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("An error occurred while deleting the user");
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          Previous
        </button>

        <div className="pagination-info">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Next
        </button>
      </div>
    );
  };

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <div className="back-link">
          <Link to="/admin">← Back to Admin Dashboard</Link>
        </div>
        <h1>Manage Users</h1>
        <button
          className="add-user-btn"
          onClick={() => setShowAddUser(!showAddUser)}
        >
          {showAddUser ? "Cancel" : "Add New User"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="close-btn"
            onClick={() => setError("")}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button
            className="close-btn"
            onClick={() => setSuccess("")}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}

      <div className="filter-section">
        <h2>Filters</h2>
        <div className="filter-form">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="assessor">Assessor</option>
                <option value="participant">Participant</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="search">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name, email, or organization"
              />
            </div>

            <div className="filter-actions">
              <button onClick={resetFilters} className="reset-btn">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddUser && (
        <div className="user-form-card">
          <h2>Add New User</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newUser.name}
                onChange={handleNewUserChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address*</label>
              <input
                type="email"
                id="email"
                name="email"
                value={newUser.email}
                onChange={handleNewUserChange}
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password*</label>
              <input
                type="password"
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleNewUserChange}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="userRole">Role*</label>
              <select
                id="userRole"
                name="role"
                value={newUser.role}
                onChange={handleNewUserChange}
                required
              >
                <option value="assessor">Assessor</option>
                <option value="supervisor">Supervisor</option>
                <option value="participant">Participant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {newUser.role !== "participant" ? (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="organization">Organization*</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={newUser.organization}
                  onChange={handleNewUserChange}
                  placeholder="Enter organization"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="position">Position</label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={newUser.position}
                  onChange={handleNewUserChange}
                  placeholder="Enter position (optional)"
                />
              </div>
            </div>
          ) : (
            <div className="participant-fields">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ndisNumber">NDIS Number*</label>
                  <input
                    type="text"
                    id="ndisNumber"
                    name="ndisNumber"
                    value={newUser.ndisNumber}
                    onChange={handleNewUserChange}
                    placeholder="Enter NDIS Number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth*</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={newUser.dateOfBirth}
                    onChange={handleNewUserChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    value={newUser.contactNumber}
                    onChange={handleNewUserChange}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={newUser.address}
                  onChange={handleNewUserChange}
                  placeholder="Enter address"
                  rows="3"
                ></textarea>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddUser(false);
                setNewUser({
                  name: "",
                  email: "",
                  password: "",
                  role: "assessor",
                  organization: "",
                  position: "",
                  ndisNumber: "",
                  dateOfBirth: "",
                  contactNumber: "",
                  address: "",
                });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={handleAddUser}
            >
              Add User
            </button>
          </div>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  {editingUserId === user._id ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleFormChange}
                      className="edit-input"
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>
                  {editingUserId === user._id ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleFormChange}
                      className="edit-input"
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td>
                  {editingUserId === user._id ? (
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleFormChange}
                      className="edit-select"
                    >
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="assessor">Assessor</option>
                      <option value="participant">Participant</option>
                    </select>
                  ) : (
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>
                  {editingUserId === user._id ? (
                    <input
                      type="text"
                      name="organization"
                      value={editForm.organization}
                      onChange={handleFormChange}
                      className="edit-input"
                    />
                  ) : (
                    user.organization || "-"
                  )}
                </td>
                <td>
                  {editingUserId === user._id ? (
                    <div className="edit-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                      <button className="save-btn" onClick={handleSaveUser}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="user-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditUser(user._id)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <p>No users found matching your criteria.</p>
        </div>
      )}

      {renderPagination()}
    </div>
  );
};

export default ManageUsers;
