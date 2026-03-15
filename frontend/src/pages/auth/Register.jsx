import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoFastFoodOutline } from 'react-icons/io5';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import * as authApi from '../../api/auth.api';
import { ROLES, VEHICLE_TYPES } from '../../constants';
import LocationPicker from '../../components/map/LocationPicker';

const roleOptions = [
  { value: ROLES.CUSTOMER, label: '🛒 Customer', desc: 'Order food from restaurants' },
  { value: ROLES.RESTAURANT, label: '🍳 Restaurant', desc: 'Manage your restaurant' },
  { value: ROLES.DELIVERY, label: '🚴 Delivery Partner', desc: 'Deliver orders' },
  { value: ROLES.NGO, label: '🤝 NGO', desc: 'Collect leftover food' },
];

const Register = () => {
  const [step, setStep] = useState(1); // 1 = role select, 2 = form
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    // Restaurant fields
    restaurantName: '', description: '', phone: '', cuisineType: '',
    street: '', city: '', state: '', pincode: '',
    coordinates: { lat: '', lng: '' },
    // Delivery fields
    vehicleType: 'bike',
    // NGO fields
    organizationName: '', ngoPhone: '',
    ngoStreet: '', ngoCity: '', ngoState: '', ngoPincode: '',
    ngoCoordinates: { lat: '', lng: '' },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role,
      };

      // Add role-specific fields
      if (role === ROLES.RESTAURANT) {
        payload.restaurantName = formData.restaurantName;
        payload.description = formData.description;
        payload.phone = formData.phone;
        payload.cuisineType = formData.cuisineType.split(',').map(s => s.trim()).filter(Boolean);
        payload.address = {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        };
        // Include coordinates if captured
        const lat = Number(formData.coordinates?.lat);
        const lng = Number(formData.coordinates?.lng);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          payload.address.coordinates = { lat, lng };
        }
      } else if (role === ROLES.DELIVERY) {
        payload.vehicleType = formData.vehicleType;
      } else if (role === ROLES.NGO) {
        payload.organizationName = formData.organizationName;
        payload.phone = formData.ngoPhone;
        payload.address = {
          street: formData.ngoStreet,
          city: formData.ngoCity,
          state: formData.ngoState,
          pincode: formData.ngoPincode,
        };
        // Include coordinates if captured
        const lat = Number(formData.ngoCoordinates?.lat);
        const lng = Number(formData.ngoCoordinates?.lng);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          payload.address.coordinates = { lat, lng };
        }
      }

      const { data } = await authApi.register(payload);
      login(data.user, data.token);
      toast.success('Account created successfully!');

      if (data.user.status === 'pending') {
        navigate('/pending-approval');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle location picked for restaurant
  const handleRestaurantLocation = (parsed) => {
    setFormData(prev => ({
      ...prev,
      street: parsed.street || prev.street,
      city: parsed.city || prev.city,
      state: parsed.state || prev.state,
      pincode: parsed.pincode || prev.pincode,
      coordinates: parsed.coordinates || prev.coordinates,
    }));
  };

  // Handle location picked for NGO
  const handleNgoLocation = (parsed) => {
    setFormData(prev => ({
      ...prev,
      ngoStreet: parsed.street || prev.ngoStreet,
      ngoCity: parsed.city || prev.ngoCity,
      ngoState: parsed.state || prev.ngoState,
      ngoPincode: parsed.pincode || prev.ngoPincode,
      ngoCoordinates: parsed.coordinates || prev.ngoCoordinates,
    }));
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      background: 'var(--color-bg-dark)',
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <IoFastFoodOutline size={36} style={{ color: 'var(--color-primary)' }} />
            <span className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800 }}>FoodDash</span>
          </Link>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {step === 1 ? 'Choose your role to get started' : `Register as ${role}`}
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {step === 1 ? (
            /* ===== Step 1: Role Selection ===== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRole(opt.value); setStep(2); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(249,115,22,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-input)'; }}
                >
                  <span style={{ fontSize: '1.75rem' }}>{opt.label.split(' ')[0]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{opt.label.slice(2).trim()}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* ===== Step 2: Registration Form ===== */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}
              >
                ← Change role
              </button>

              {/* Common fields */}
              <InputField icon={<HiOutlineUser size={18} />} name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} />
              <InputField icon={<HiOutlineMail size={18} />} name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} />
              
              <div style={{ position: 'relative' }}>
                <HiOutlineLockClosed size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', zIndex: 1 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input-field"
                  placeholder="Password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                </button>
              </div>

              <InputField icon={<HiOutlineLockClosed size={18} />} type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />

              {/* Restaurant fields */}
              {role === ROLES.RESTAURANT && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Restaurant Details</p>
                  </div>
                  <InputField name="restaurantName" placeholder="Restaurant Name" value={formData.restaurantName} onChange={handleChange} />
                  <InputField name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
                  <InputField name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
                  <InputField name="cuisineType" placeholder="Cuisine Types (comma separated)" value={formData.cuisineType} onChange={handleChange} />

                  {/* Location Picker */}
                  <LocationPicker
                    coordinates={formData.coordinates?.lat ? formData.coordinates : null}
                    onChange={handleRestaurantLocation}
                    compact
                  />

                  <InputField name="street" placeholder="Street Address" value={formData.street} onChange={handleChange} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <InputField name="city" placeholder="City" value={formData.city} onChange={handleChange} />
                    <InputField name="state" placeholder="State" value={formData.state} onChange={handleChange} />
                  </div>
                  <InputField name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleChange} />
                </>
              )}

              {/* Delivery fields */}
              {role === ROLES.DELIVERY && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Vehicle Details</p>
                  </div>
                  <select
                    name="vehicleType"
                    className="input-field"
                    value={formData.vehicleType}
                    onChange={handleChange}
                  >
                    {VEHICLE_TYPES.map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                  <div style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#22c55e',
                  }}>
                    Bank account details are optional now. You can add them later from Delivery Profile for payouts.
                  </div>
                </>
              )}

              {role === ROLES.RESTAURANT && (
                <div style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#22c55e',
                }}>
                  Bank account details are optional now. You can add them later from Restaurant Settings for payouts.
                </div>
              )}

              {/* NGO fields */}
              {role === ROLES.NGO && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Organization Details</p>
                  </div>
                  <InputField name="organizationName" placeholder="Organization Name" value={formData.organizationName} onChange={handleChange} />
                  <InputField name="ngoPhone" placeholder="Phone Number" value={formData.ngoPhone} onChange={handleChange} />

                  {/* Location Picker */}
                  <LocationPicker
                    coordinates={formData.ngoCoordinates?.lat ? formData.ngoCoordinates : null}
                    onChange={handleNgoLocation}
                    compact
                  />

                  <InputField name="ngoStreet" placeholder="Street Address" value={formData.ngoStreet} onChange={handleChange} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <InputField name="ngoCity" placeholder="City" value={formData.ngoCity} onChange={handleChange} />
                    <InputField name="ngoState" placeholder="State" value={formData.ngoState} onChange={handleChange} />
                  </div>
                  <InputField name="ngoPincode" placeholder="Pincode" value={formData.ngoPincode} onChange={handleChange} />
                </>
              )}

              {role !== ROLES.CUSTOMER && (
                <div style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-warning)',
                }}>
                  ⚠️ Your account will need admin approval before you can access the dashboard.
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

// Reusable input wrapper
const InputField = ({ icon, name, type = 'text', placeholder, value, onChange }) => (
  <div style={{ position: 'relative' }}>
    {icon && (
      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
        {icon}
      </span>
    )}
    <input
      type={type}
      name={name}
      className="input-field"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={icon ? { paddingLeft: '2.5rem' } : {}}
    />
  </div>
);

export default Register;
