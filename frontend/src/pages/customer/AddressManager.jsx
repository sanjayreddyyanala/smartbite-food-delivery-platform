import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineLocationMarker, HiOutlineStar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as addressApi from '../../api/address.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import LocationPicker from '../../components/map/LocationPicker';
import { ADDRESS_LABELS } from '../../constants';

const AddressManager = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // 'idle' | 'detecting' | 'detected' | 'failed'

  const [form, setForm] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    coordinates: { lat: '', lng: '' },
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data } = await addressApi.getAddresses();
      setAddresses(data.addresses || []);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect user location from browser
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('failed');
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((prev) => ({
          ...prev,
          coordinates: { lat: latitude, lng: longitude },
        }));
        setGeoStatus('detected');
        toast.success('Location detected!');
      },
      (error) => {
        setGeoStatus('failed');
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out. Please try again.',
        };
        toast.error(messages[error.code] || 'Failed to detect location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setForm({ label: 'Home', street: '', city: '', state: '', pincode: '', coordinates: { lat: '', lng: '' } });
    setGeoStatus('idle');
    setModalOpen(true);
    // Auto-detect location when opening add modal
    setTimeout(() => {
      if (navigator.geolocation) {
        setGeoStatus('detecting');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setForm((prev) => ({
              ...prev,
              coordinates: { lat: position.coords.latitude, lng: position.coords.longitude },
            }));
            setGeoStatus('detected');
          },
          () => setGeoStatus('idle'),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    }, 300);
  };

  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setForm({
      label: addr.label || 'Home',
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      coordinates: addr.coordinates || { lat: '', lng: '' },
    });
    // If editing and already has valid coordinates, show as detected
    setGeoStatus(addr.coordinates?.lat && addr.coordinates?.lng ? 'detected' : 'idle');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.street || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate coordinates — both must be numbers if provided
    const lat = form.coordinates?.lat !== '' && form.coordinates?.lat != null ? Number(form.coordinates.lat) : null;
    const lng = form.coordinates?.lng !== '' && form.coordinates?.lng != null ? Number(form.coordinates.lng) : null;
    if ((lat !== null && isNaN(lat)) || (lng !== null && isNaN(lng))) {
      toast.error('Coordinates must be valid numbers');
      return;
    }

    const payload = {
      label: form.label,
      street: form.street,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
    };

    // Only include coordinates if both are valid numbers
    if (lat !== null && lng !== null) {
      payload.coordinates = { lat, lng };
    }

    setSaving(true);
    try {
      if (editingAddress) {
        await addressApi.updateAddress(editingAddress._id, payload);
        toast.success('Address updated');
      } else {
        await addressApi.addAddress(payload);
        toast.success('Address added');
      }
      setModalOpen(false);
      fetchAddresses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await addressApi.deleteAddress(id);
      toast.success('Address deleted');
      setDeleteConfirm(null);
      fetchAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressApi.setDefault(id);
      toast.success('Default address updated');
      fetchAddresses();
    } catch {
      toast.error('Failed to set default');
    }
  };

  if (loading) return <Loading message="Loading addresses..." />;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Addresses</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage your delivery addresses
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem' }}>
          <HiOutlinePlus size={18} /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No addresses saved"
          message="Add your delivery addresses for a faster checkout experience."
          action={
            <button onClick={openAddModal} className="btn-primary">
              Add Your First Address
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {addresses.map((addr, i) => (
            <div
              key={addr._id}
              className="card animate-fade-in"
              style={{
                animationDelay: `${i * 0.05}s`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                position: 'relative',
                border: addr.isDefault ? '1px solid var(--color-primary)' : undefined,
              }}
            >
              {/* Icon */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '0.75rem',
                background: 'rgba(249,115,22,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <HiOutlineLocationMarker size={22} style={{ color: 'var(--color-primary)' }} />
              </div>

              {/* Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge" style={{
                    background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)',
                    fontSize: '0.7rem',
                  }}>
                    {addr.label || 'Address'}
                  </span>
                  {addr.isDefault && (
                    <span className="badge" style={{
                      background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)',
                      fontSize: '0.65rem',
                    }}>
                      <HiOutlineStar size={10} style={{ marginRight: '0.2rem' }} /> Default
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {[addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr._id)}
                    title="Set as default"
                    style={{
                      width: '34px', height: '34px', borderRadius: '0.5rem',
                      background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <HiOutlineStar size={14} />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(addr)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '0.5rem',
                    background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <HiOutlinePencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(addr._id)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    color: 'var(--color-error)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <HiOutlineTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAddress ? 'Edit Address' : 'Add Address'} maxWidth="480px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Label Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
              Label
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {ADDRESS_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm({ ...form, label })}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                    ...(form.label === label ? {
                      background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff',
                    } : {
                      background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)',
                    }),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
              Street *
            </label>
            <input
              className="input-field"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="123 Main Street, Apt 4B"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                City *
              </label>
              <input
                className="input-field"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                State *
              </label>
              <input
                className="input-field"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
              Pincode *
            </label>
            <input
              className="input-field"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              placeholder="560001"
              required
            />
          </div>

          {/* Location Picker — two-button: Current Location / Choose from Map */}
          <LocationPicker
            coordinates={form.coordinates?.lat ? form.coordinates : null}
            onChange={(parsed) => {
              setForm((prev) => ({
                ...prev,
                street: parsed.street || prev.street,
                city: parsed.city || prev.city,
                state: parsed.state || prev.state,
                pincode: parsed.pincode || prev.pincode,
                coordinates: parsed.coordinates || prev.coordinates,
              }));
              setGeoStatus('detected');
            }}
            compact
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : editingAddress ? 'Update' : 'Add Address'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Address" maxWidth="400px">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗑️</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Are you sure you want to delete this address? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* Spinner animation for location detection */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AddressManager;
