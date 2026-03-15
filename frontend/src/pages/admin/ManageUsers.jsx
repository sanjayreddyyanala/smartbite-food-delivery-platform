import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineBan, HiOutlineCheck, HiOutlineFilter, HiOutlineEye, HiOutlineMail, HiOutlineCalendar, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatDate, timeAgo } from '../../utils/formatDate';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'customer', label: 'Customer' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'delivery', label: 'Delivery Partner' },
  { value: 'ngo', label: 'NGO' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'banned', label: 'Banned' },
];

const ManageUsers = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [banModal, setBanModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [detailUser, setDetailUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  // Sync role filter when URL search params change (e.g. navigating from dashboard)
  useEffect(() => {
    const urlRole = searchParams.get('role') || '';
    setRoleFilter(urlRole);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAllUsers(params);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async () => {
    const { user } = banModal;
    if (!user) return;

    setActionLoading(user._id);
    setBanModal({ open: false, user: null });

    try {
      const { data } = await adminApi.toggleUserBan(user._id);
      toast.success(data.message);
      setUsers(users.map((u) => (u._id === user._id ? data.user : u)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    const { user } = deleteModal;
    if (!user) return;

    setActionLoading(user._id);
    setDeleteModal({ open: false, user: null });
    setDetailUser(null);

    try {
      const { data } = await adminApi.deleteUser(user._id);
      toast.success(data.message);
      setUsers(users.filter((u) => u._id !== user._id));
      setTotal(prev => prev - 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      customer: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      restaurant: { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
      delivery: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      ngo: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6' },
      admin: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    };
    const c = colors[role] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {role === 'delivery' ? 'Delivery Partner' : role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
      rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
      banned: { bg: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
    };
    const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  const filteredUsers = users
    .filter((u) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name_az') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_za') return (b.name || '').localeCompare(a.name || '');
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  if (loading && page === 1) return <Loading message="Loading users..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {roleFilter ? `${roleFilter === 'delivery' ? 'Delivery Partners' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1) + 's'}` : 'Manage Users'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {roleFilter ? `Showing all ${roleFilter === 'delivery' ? 'delivery partners' : roleFilter + 's'}` : 'View all registered users and manage their access'}
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <HiOutlineSearch
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Total Count */}
        <div style={{
          marginLeft: 'auto',
          fontSize: '0.8rem',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}>
          {total} total users
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '130px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_az">Name A → Z</option>
          <option value="name_za">Name Z → A</option>
        </select>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No users found"
          message="Try adjusting your filters or search terms."
        />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0',
              fontSize: '0.85rem',
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, i) => (
                  <tr
                    key={user._id}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setDetailUser(user)}
                    style={{
                      animation: `fadeIn 0.3s ease ${i * 0.03}s forwards`,
                      opacity: 0,
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                      ...(actionLoading === user._id ? { opacity: 0.5, pointerEvents: 'none' } : {}),
                    }}
                  >
                    {/* User Info */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}>
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      {getStatusBadge(user.status)}
                    </td>

                    {/* Joined */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                      {timeAgo(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailUser(user); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '0.5rem',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                        >
                          <HiOutlineEye size={14} /> View
                        </button>
                        {user.role !== 'admin' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setBanModal({ open: true, user }); }}
                              disabled={actionLoading === user._id}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                background: user.status === 'banned' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: user.status === 'banned' ? '#22c55e' : '#ef4444',
                                border: `1px solid ${user.status === 'banned' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                              }}
                            >
                              {user.status === 'banned' ? <><HiOutlineCheck size={14} /> Unban</> : <><HiOutlineBan size={14} /> Ban</>}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, user }); }}
                              disabled={actionLoading === user._id}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                                border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem',
                                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                              }}
                            >
                              <HiOutlineTrash size={14} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', padding: '0 0.75rem' }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Ban/Unban Confirmation Modal */}
      <Modal
        isOpen={banModal.open}
        onClose={() => setBanModal({ open: false, user: null })}
        title={banModal.user?.status === 'banned' ? 'Unban User' : 'Ban User'}
        maxWidth="420px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            {banModal.user?.status === 'banned' ? '✅' : '🚫'}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Are you sure you want to{' '}
            <strong>{banModal.user?.status === 'banned' ? 'unban' : 'ban'}</strong>{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{banModal.user?.name}</strong>?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            {banModal.user?.status === 'banned'
              ? 'Their access will be restored immediately.'
              : 'They will be immediately locked out of the platform.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setBanModal({ open: false, user: null })}
            >
              Cancel
            </button>
            <button
              className={banModal.user?.status === 'banned' ? 'btn-primary' : 'btn-danger'}
              onClick={handleBanToggle}
            >
              {banModal.user?.status === 'banned' ? 'Unban' : 'Ban User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        title="User Details"
        maxWidth="480px"
      >
        {detailUser && (
          <div>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {detailUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{detailUser.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {getRoleBadge(detailUser.role)} {getStatusBadge(detailUser.status)}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div style={{
              background: 'var(--color-bg-input)', borderRadius: '0.75rem',
              padding: '1rem', marginBottom: '1rem',
            }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Contact Information</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <HiOutlineMail size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <a href={`mailto:${detailUser.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                    {detailUser.email}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <HiOutlineCalendar size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Joined {formatDate(detailUser.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div style={{
              background: 'var(--color-bg-input)', borderRadius: '0.75rem',
              padding: '1rem', marginBottom: '1.25rem',
            }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Account Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>User ID</div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{detailUser._id?.slice(-10)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Last Updated</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{timeAgo(detailUser.updatedAt)}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={`mailto:${detailUser.email}`}
                className="btn-primary"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem' }}
              >
                ✉️ Send Email
              </a>
              {detailUser.role !== 'admin' && (
                <button
                  className={detailUser.status === 'banned' ? 'btn-primary' : 'btn-danger'}
                  style={{ flex: 1, fontSize: '0.85rem' }}
                  onClick={() => { setDetailUser(null); setBanModal({ open: true, user: detailUser }); }}
                >
                  {detailUser.status === 'banned' ? '✅ Unban User' : '🚫 Ban User'}
                </button>
              )}
              {detailUser.role !== 'admin' && (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => { setDeleteModal({ open: true, user: detailUser }); }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="Delete User"
        maxWidth="420px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗑️</div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Are you sure you want to <strong>permanently delete</strong>{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{deleteModal.user?.name}</strong>?
          </p>
          <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            ⚠️ This action cannot be undone. All user data will be permanently removed.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setDeleteModal({ open: false, user: null })}
            >
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={handleDelete}
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageUsers;
