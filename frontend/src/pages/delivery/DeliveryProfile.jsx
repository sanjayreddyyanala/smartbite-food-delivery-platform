import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as deliveryApi from '../../api/delivery.api';
import Loading from '../../components/common/Loading';
import { VEHICLE_TYPES } from '../../constants';

const DeliveryProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [form, setForm] = useState({
    vehicleType: 'bike',
    licenseNumber: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: '',
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await deliveryApi.getDeliveryProfile();
      const p = data.profile || data.user || {};
      setProfile(p);
      setForm({
        vehicleType: p.vehicleType || 'bike',
        licenseNumber: p.licensePlate || p.licenseNumber || '',
        bankDetails: {
          accountHolderName: p.bankDetails?.accountHolderName || '',
          accountNumber: p.bankDetails?.accountNumber || '',
          ifscCode: p.bankDetails?.ifscCode || '',
          bankName: p.bankDetails?.bankName || '',
          upiId: p.bankDetails?.upiId || '',
        },
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await deliveryApi.toggleAvailability();
      setProfile((prev) => ({ ...prev, isAvailable: data.isAvailable }));
      toast.success(data.message || 'Availability updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await deliveryApi.updateDeliveryProfile({
        vehicleType: form.vehicleType,
        licenseNumber: form.licenseNumber,
        bankDetails: form.bankDetails,
      });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Loading profile..." />;

  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' };

  return (
    <div style={{ maxWidth: '500px' }}>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Delivery Profile</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Manage your delivery details</p>
      </div>

      {/* Profile info */}
      {profile && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 800, color: '#fff',
            }}>
              {profile.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{profile.name || 'Delivery Partner'}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{profile.email}</p>
              {profile.phone && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{profile.phone}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
              background: profile.isAvailable ? 'rgba(34,197,94,0.15)' : 'var(--color-bg-input)',
              color: profile.isAvailable ? '#22c55e' : 'var(--color-text-muted)',
              border: `1px solid ${profile.isAvailable ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`
            }}>
              ● {profile.isAvailable ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', textDecoration: 'underline', padding: 0
              }}
            >
              {toggling ? 'Updating...' : `Go ${profile.isAvailable ? 'Offline' : 'Online'}`}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="card animate-fade-in" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Vehicle Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, vehicleType: v })}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.85rem',
                  fontWeight: 600, border: '1px solid', cursor: 'pointer', textTransform: 'capitalize',
                  ...(form.vehicleType === v ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
                }}
              >
                {v === 'bike' ? '🏍️' : v === 'scooter' ? '🛵' : '🚲'} {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>License Number</label>
          <input className="input-field" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-0420XXX" />
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.625rem' }}>
            Settlement Bank Details (Optional)
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            Add now or later. Admin will use this for payout settlement.
          </p>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            <input
              className="input-field"
              value={form.bankDetails.accountHolderName}
              onChange={(e) => setForm({
                ...form,
                bankDetails: { ...form.bankDetails, accountHolderName: e.target.value },
              })}
              placeholder="Account Holder Name"
            />
            <input
              className="input-field"
              value={form.bankDetails.accountNumber}
              onChange={(e) => setForm({
                ...form,
                bankDetails: { ...form.bankDetails, accountNumber: e.target.value },
              })}
              placeholder="Account Number"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <input
                className="input-field"
                value={form.bankDetails.ifscCode}
                onChange={(e) => setForm({
                  ...form,
                  bankDetails: { ...form.bankDetails, ifscCode: e.target.value.toUpperCase() },
                })}
                placeholder="IFSC Code"
              />
              <input
                className="input-field"
                value={form.bankDetails.bankName}
                onChange={(e) => setForm({
                  ...form,
                  bankDetails: { ...form.bankDetails, bankName: e.target.value },
                })}
                placeholder="Bank Name"
              />
            </div>
            <input
              className="input-field"
              value={form.bankDetails.upiId}
              onChange={(e) => setForm({
                ...form,
                bankDetails: { ...form.bankDetails, upiId: e.target.value.toLowerCase() },
              })}
              placeholder="UPI ID (optional)"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default DeliveryProfile;
