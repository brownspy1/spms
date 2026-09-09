import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertOctagon,
  Users,
} from 'lucide-react';
import { authApi } from '../services/api';

export default function SecuritySettings({ currentUser, onUserUpdate }) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(currentUser?.is_2fa_enabled || false);
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [twoFaMessage, setTwoFaMessage] = useState(null);

  // Admin User Creation
  const [usersList, setUsersList] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'Staff',
    password: '',
  });
  const [createMsg, setCreateMsg] = useState(null);

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const data = await authApi.listUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const data = await authApi.setup2FA();
      setTotpSetupData(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    try {
      await authApi.verify2FA(totpVerifyCode);
      setIs2FAEnabled(true);
      setTotpSetupData(null);
      setTotpVerifyCode('');
      setTwoFaMessage('Two-factor authentication (TOTP) has been successfully activated on your account.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDisable2FA = async () => {
    if (confirm('Are you sure you want to disable 2FA? This will decrease your account security.')) {
      try {
        await authApi.disable2FA();
        setIs2FAEnabled(false);
        setTwoFaMessage('Two-factor authentication disabled.');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateMsg(null);
    try {
      await authApi.createUser(newUserForm);
      setCreateMsg({ type: 'success', text: `User ${newUserForm.username} created successfully.` });
      setNewUserForm({ username: '', email: '', full_name: '', role: 'Staff', password: '' });
      loadUsers();
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Center & Access Control</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage two-factor authentication, account lockout safeguards, and Role-Based Access Control (RBAC).
        </p>
      </div>

      {/* Security Policies Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <Lock className="w-4 h-4" />
            <span>Password Cryptography</span>
          </div>
          <p className="text-slate-300 text-xs font-medium">Bcrypt Multi-Round Salted Hashing</p>
          <p className="text-[11px] text-slate-500">Zero plaintext or reversible password storage.</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertOctagon className="w-4 h-4" />
            <span>Account Lockout Policy</span>
          </div>
          <p className="text-slate-300 text-xs font-medium">5 Failed Attempts = 15m Lockout</p>
          <p className="text-[11px] text-slate-500">Mitigates brute-force and credential stuffing.</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Server-Side RBAC</span>
          </div>
          <p className="text-slate-300 text-xs font-medium">Enforced on Every API Endpoint</p>
          <p className="text-[11px] text-slate-500">Separation of duties: Admin, Pharmacist, Staff.</p>
        </div>
      </div>

      {/* 2FA Configuration Section */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Two-Factor Authentication (TOTP 2FA)</h3>
              <p className="text-slate-400 text-xs">
                Protect your account using Google Authenticator, Authy, or 1Password.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              is2FAEnabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {is2FAEnabled ? '2FA ACTIVE' : '2FA DISABLED'}
          </span>
        </div>

        {twoFaMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {twoFaMessage}
          </div>
        )}

        {!is2FAEnabled ? (
          <div>
            {!totpSetupData ? (
              <button
                onClick={handleStart2FASetup}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-600/20"
              >
                Configure 2FA Authenticator
              </button>
            ) : (
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 max-w-md">
                <span className="text-xs font-bold text-white block">Step 1: Enter Secret into Authenticator App</span>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center font-mono text-sm tracking-widest text-emerald-400 select-all">
                  {totpSetupData.secret}
                </div>
                <div className="text-[11px] text-slate-400">
                  Or use standard authenticator URI:{' '}
                  <span className="font-mono text-slate-500 break-all">{totpSetupData.otpauth_url}</span>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-3 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-white block">Step 2: Enter 6-Digit Code to Confirm</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={totpVerifyCode}
                      onChange={(e) => setTotpVerifyCode(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono text-base text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={totpVerifyCode.length !== 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={handleDisable2FA}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs transition-colors border border-rose-500/30"
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>

      {/* Admin User Management Section */}
      {currentUser?.role === 'Admin' && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">User Management & Staff Roles (Admin)</h3>
                <p className="text-slate-400 text-xs">Provision dispensary personnel and assign access permissions.</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              {showCreateUser ? 'Cancel' : '+ New User'}
            </button>
          </div>

          {/* New User Form */}
          {showCreateUser && (
            <form onSubmit={handleCreateUser} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block">Create Staff / Pharmacist User</span>

              {createMsg && (
                <div
                  className={`p-2.5 rounded-lg border ${
                    createMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {createMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400">Username</label>
                  <input
                    required
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Email</label>
                  <input
                    required
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400">Initial Password</label>
                  <input
                    required
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
                >
                  Create User
                </button>
              </div>
            </form>
          )}

          {/* Active Users Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">2FA Active</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/40">
                    <td className="p-3">
                      <div className="font-semibold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400">@{u.username}</div>
                    </td>
                    <td className="p-3 text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.is_2fa_enabled ? (
                        <span className="text-emerald-400 font-semibold">Enabled</span>
                      ) : (
                        <span className="text-slate-500">Disabled</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
