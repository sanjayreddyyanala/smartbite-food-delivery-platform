import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import * as restaurantApi from '../../api/restaurant.api';
import Loading from '../../components/common/Loading';
import ImageLightbox from '../../components/common/ImageLightbox';
import LocationPicker from '../../components/map/LocationPicker';

const RestaurantSettings = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', description: '', phone: '',
    cuisineType: '',
    openingHours: { open: '', close: '' },
    address: { street: '', city: '', state: '', pincode: '', coordinates: { lat: '', lng: '' } },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: '',
    },
  });

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data } = await restaurantApi.getMyRestaurant();
      const r = data.restaurant;
      setRestaurant(r);
      setIsNew(false);
      setGalleryImages(r.images || []);
      setForm({
        name: r.name || '',
        description: r.description || '',
        phone: r.phone || '',
        cuisineType: r.cuisineType?.join(', ') || '',
        openingHours: r.openingHours || { open: '', close: '' },
        address: {
          street: r.address?.street || '',
          city: r.address?.city || '',
          state: r.address?.state || '',
          pincode: r.address?.pincode || '',
          coordinates: r.address?.coordinates || { lat: '', lng: '' },
        },
        bankDetails: {
          accountHolderName: r.bankDetails?.accountHolderName || '',
          accountNumber: r.bankDetails?.accountNumber || '',
          ifscCode: r.bankDetails?.ifscCode || '',
          bankName: r.bankDetails?.bankName || '',
          upiId: r.bankDetails?.upiId || '',
        },
      });
    } catch (err) {
      if (err.response?.status === 404) {
        // No restaurant yet — show creation form
        setIsNew(true);
      } else {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Restaurant name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cuisineType: form.cuisineType.split(',').map((s) => s.trim()).filter(Boolean),
        bankDetails: {
          ...form.bankDetails,
          ifscCode: form.bankDetails.ifscCode?.toUpperCase() || '',
          upiId: form.bankDetails.upiId?.toLowerCase() || '',
        },
      };
      if (isNew) {
        const { data } = await restaurantApi.createRestaurant(payload);
        setRestaurant(data.restaurant);
        setIsNew(false);
        toast.success('Restaurant created!');
      } else {
        await restaurantApi.updateRestaurant(restaurant._id, payload);
        toast.success('Settings updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ===== Gallery handlers =====
  const handleUploadImages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      const { data } = await restaurantApi.uploadRestaurantImages(restaurant._id, formData);
      setGalleryImages(data.images);
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    setDeletingUrl(imageUrl);
    try {
      const { data } = await restaurantApi.deleteRestaurantImage(restaurant._id, imageUrl);
      setGalleryImages(data.images);
      toast.success('Image deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete image');
    } finally {
      setDeletingUrl(null);
    }
  };

  if (loading) return <Loading message="Loading settings..." />;

  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{isNew ? 'Create Restaurant' : 'Restaurant Settings'}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{isNew ? 'Set up your restaurant profile to get started' : 'Update your restaurant profile'}</p>
      </div>

      <form onSubmit={handleSave} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Restaurant Name</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone</label>
          <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
        </div>

        {/* Cuisine Types */}
        <div>
          <label style={labelStyle}>Cuisine Types (comma-separated)</label>
          <input className="input-field" value={form.cuisineType} onChange={(e) => setForm({ ...form, cuisineType: e.target.value })} placeholder="North Indian, Chinese, Fast Food" />
        </div>

        {/* Opening Hours */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Opening Time</label>
            <input className="input-field" type="time" value={form.openingHours.open} onChange={(e) => setForm({ ...form, openingHours: { ...form.openingHours, open: e.target.value } })} />
          </div>
          <div>
            <label style={labelStyle}>Closing Time</label>
            <input className="input-field" type="time" value={form.openingHours.close} onChange={(e) => setForm({ ...form, openingHours: { ...form.openingHours, close: e.target.value } })} />
          </div>
        </div>

        {/* Address */}
        <div>
          <label style={{ ...labelStyle, marginBottom: '0.625rem' }}>Address</label>

          {/* Location Picker */}
          <div style={{ marginBottom: '0.75rem' }}>
            <LocationPicker
              coordinates={form.address.coordinates?.lat ? form.address.coordinates : null}
              onChange={(parsed) => {
                setForm(prev => ({
                  ...prev,
                  address: {
                    ...prev.address,
                    street: parsed.street || prev.address.street,
                    city: parsed.city || prev.address.city,
                    state: parsed.state || prev.address.state,
                    pincode: parsed.pincode || prev.address.pincode,
                    coordinates: parsed.coordinates || prev.address.coordinates,
                  },
                }));
              }}
              compact
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <input className="input-field" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} placeholder="Street" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <input className="input-field" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} placeholder="City" />
              <input className="input-field" value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} placeholder="State" />
            </div>
            <input className="input-field" value={form.address.pincode} onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} placeholder="Pincode" style={{ maxWidth: '200px' }} />
          </div>
        </div>

        <div>
          <label style={{ ...labelStyle, marginBottom: '0.625rem' }}>Settlement Bank Details (Optional)</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
            You can keep this empty for now and update later. Admin will use this for payout settlement.
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
          {saving ? 'Saving...' : isNew ? 'Create Restaurant' : 'Save Changes'}
        </button>
      </form>

      {/* ===== Gallery Images Section ===== */}
      {!isNew && restaurant && (
        <div className="card animate-fade-in" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📸 Gallery Images</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Upload photos of your restaurant for customers to see
              </p>
            </div>
            <label
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                background: 'var(--color-primary)', color: '#fff',
                borderRadius: '0.5rem', cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {uploading ? '⏳ Uploading...' : '+ Add Images'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadImages}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {galleryImages.length === 0 ? (
            <div style={{
              padding: '2rem', textAlign: 'center', border: '2px dashed var(--color-border)',
              borderRadius: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
              No gallery images yet. Upload some photos to showcase your restaurant!
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}>
              {galleryImages.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImage(url)}
                  style={{
                    position: 'relative', paddingTop: '100%', borderRadius: '0.75rem',
                    overflow: 'hidden', background: `url(${url}) center / cover no-repeat`,
                    border: '1px solid var(--color-border)', cursor: 'pointer',
                  }}
                >
                  <button
                    onClick={() => handleDeleteImage(url)}
                    disabled={deletingUrl === url}
                    style={{
                      position: 'absolute', top: '0.375rem', right: '0.375rem',
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: 'none', cursor: deletingUrl === url ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: 700,
                      opacity: deletingUrl === url ? 0.5 : 1,
                      transition: 'all 0.2s', backdropFilter: 'blur(4px)',
                    }}
                    title="Delete image"
                  >
                    {deletingUrl === url ? '…' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          images={galleryImages}
          onClose={() => setLightboxImage(null)}
          onNavigate={(url) => setLightboxImage(url)}
        />
      )}
    </div>
  );
};

export default RestaurantSettings;
