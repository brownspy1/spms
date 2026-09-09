import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  X,
} from 'lucide-react';
import { authApi } from '../services/api';

export default function StaffManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'Staff',
    password: '',
  });
  const [formMsg, setFormMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await authApi.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormMsg(null);
    setSubmitting(true);
    try {
      await authApi.createUser(formData);
      setFormMsg({ type: 'success', text: `User ${formData.username} registered successfully!` });
      setFormData({ username: '', full_name: '', email: '', role: 'Staff', password: '' });
      setTimeout(() => {
        setShowAddModal(false);
        setFormMsg(null);
      }, 1200);
      loadUsers();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const newStatus = !user.is_active;
    if (confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} user ${user.username}?`)) {
      try {
        await authApi.updateUser(user.id, { is_active: newStatus });
        loadUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleResetLockout = async (user) => {
    try {
      await authApi.updateUser(user.id, { reset_lockout: true });
      alert(`Account lockout cleared for ${user.username}.`);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete user "${user.username}" (${user.full_name})? This action cannot be undone.`)) {
      try {
        await authApi.deleteUser(user.id);
        loadUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const roleColors = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    Pharmacist: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Staff: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };

  const stats = {
    total: users.length,
    pharmacists: users.filter((u) => u.role === 'Pharmacist').length,
    staff: users.filter((u) => u.role === 'Staff').length,
    twoFa: users.filter((u) => u.is_2fa_enabled).length,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" />
            <span>Staff & User Management</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Provision dispensary staff, manage clinical pharmacists, assign roles, and audit access permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff / User</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs font-medium">Total Personnel</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs font-medium">Clinical Pharmacists</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.pharmacists}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs font-medium">Dispensary Staff</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.staff}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs font-medium">2FA Protected</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.twoFa}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Admin', 'Pharmacist', 'Staff'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === role.toLowerCase()
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
          <button
            onClick={loadUsers}
            title="Refresh user list"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">2FA Security</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No staff members found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                  return (
                    <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {u.full_name?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{u.full_name || u.username}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-400">{u.email}</td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] border ${roleColors[u.role] || 'bg-slate-800 text-slate-300'}`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        {u.is_2fa_enabled ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {isLocked ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              LOCKED (5 Fails)
                            </span>
                            <button
                              onClick={() => handleResetLockout(u)}
                              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                              title="Reset lockout"
                            >
                              <Unlock className="w-3 h-3" /> Unlock
                            </button>
                          </div>
                        ) : u.is_active ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={u.id === currentUser?.id}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                              u.is_active
                                ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300'
                                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white'
                            } disabled:opacity-30`}
                            title={u.is_active ? 'Suspend user' : 'Activate user'}
                          >
                            {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentUser?.id}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition-colors disabled:opacity-30"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add New Staff Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Add New Staff / User</h2>
                  <p className="text-[11px] text-slate-400">Provision account and assign role-based permissions</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins or John Smith"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Username</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. sjenkins"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Staff">Staff (POS & Sales)</option>
                    <option value="Pharmacist">Pharmacist (Clinical & Dispensing)</option>
                    <option value="Admin">Admin (Full System Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. sjenkins@spms.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Initial Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Generate Strong Password
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 symbol"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
