import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import * as foodApi from '../../api/food.api';
import * as restaurantApi from '../../api/restaurant.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatPrice } from '../../utils/formatPrice';
import { DEFAULT_RESTAURANT_CATEGORIES } from '../../constants';
import ImageLightbox from '../../components/common/ImageLightbox';

const MenuManagement = () => {
  const [foods, setFoods] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [sortBy, setSortBy] = useState('name_az');
  const [quickEditQty, setQuickEditQty] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [restaurantCategories, setRestaurantCategories] = useState(DEFAULT_RESTAURANT_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [categoryDeleteState, setCategoryDeleteState] = useState(null);

  const [noRestaurant, setNoRestaurant] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: DEFAULT_RESTAURANT_CATEGORIES[0],
    isVeg: true, defaultQuantity: 10, availableQuantity: 10,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { data } = await restaurantApi.getMyRestaurant();
      const rid = data.restaurant._id;
      setRestaurantId(rid);
      setRestaurantCategories(data.restaurant.categories?.length ? data.restaurant.categories : DEFAULT_RESTAURANT_CATEGORIES);
      const { data: foodData } = await foodApi.getRestaurantFoods(rid);
      setFoods(foodData.foods || []);
    } catch (err) {
      if (err.response?.status === 404) {
        setNoRestaurant(true);
      } else {
        toast.error('Failed to load menu');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: '',
      category: restaurantCategories[0] || DEFAULT_RESTAURANT_CATEGORIES[0],
      isVeg: true,
      defaultQuantity: 10,
      availableQuantity: 10,
    });
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  const openEditModal = (food) => {
    setEditing(food);
    setForm({
      name: food.name, description: food.description || '', price: food.price,
      category: food.category || restaurantCategories[0] || DEFAULT_RESTAURANT_CATEGORIES[0], isVeg: food.isVeg,
      defaultQuantity: food.defaultQuantity || 0,
      availableQuantity: food.availableQuantity || 0,
    });
    setImageFile(null);
    setImagePreview(food.image || '');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    if (!form.category) { toast.error('Please select a category'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', Number(form.price));
      formData.append('category', form.category);
      formData.append('isVeg', form.isVeg);
      formData.append('defaultQuantity', Number(form.defaultQuantity));
      formData.append('availableQuantity', Number(form.availableQuantity));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editing) {
        await foodApi.updateFood(restaurantId, editing._id, formData);
        toast.success('Item updated');
      } else {
        await foodApi.addFood(restaurantId, formData);
        toast.success('Item added');
      }
      setModalOpen(false);
      const { data } = await foodApi.getRestaurantFoods(restaurantId);
      setFoods(data.foods || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await foodApi.deleteFood(restaurantId, id);
      toast.success('Item deleted');
      setDeleteConfirm(null);
      setFoods(foods.filter((f) => f._id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleAvailability = async (food) => {
    try {
      await foodApi.toggleAvailability(restaurantId, food._id);
      setFoods(foods.map((f) => f._id === food._id ? { ...f, isAvailable: !f.isAvailable } : f));
      toast.success(food.isAvailable ? 'Marked unavailable' : 'Marked available');
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const handleQuickUpdateQuantity = async (foodId, newQty) => {
    try {
      if (newQty === undefined || newQty === '' || newQty < 0) {
        toast.error('Enter a valid quantity');
        return;
      }
      const { data } = await foodApi.updateQuantity(restaurantId, foodId, Number(newQty));
      setFoods(foods.map((f) => f._id === foodId ? { ...f, availableQuantity: data.foodItem.availableQuantity, isAvailable: data.foodItem.isAvailable } : f));
      toast.success('Quantity updated');
      setQuickEditQty(prev => ({ ...prev, [foodId]: undefined })); // clear quick edit state for this item
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    }
  };

  const filtered = foods
    .filter((f) => {
      if (filterCat !== 'All' && f.category !== filterCat) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_az') return a.name.localeCompare(b.name);
      if (sortBy === 'name_za') return b.name.localeCompare(a.name);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'avail_high') return (b.availableQuantity || 0) - (a.availableQuantity || 0);
      return 0;
    });

  const categoryOptions = useMemo(() => {
    const mergedCategories = restaurantCategories.length > 0
      ? [...restaurantCategories]
      : [...DEFAULT_RESTAURANT_CATEGORIES];

    for (const food of foods) {
      if (food.category && !mergedCategories.includes(food.category)) {
        mergedCategories.push(food.category);
      }
    }

    return mergedCategories;
  }, [restaurantCategories, foods]);

  const getCategoryUsageCount = (category) => foods.filter((food) => food.category === category).length;

  const reloadFoods = async () => {
    if (!restaurantId) return;
    const { data } = await foodApi.getRestaurantFoods(restaurantId);
    setFoods(data.foods || []);
  };

  const persistCategories = async (categories, reassignments = {}) => {
    if (!restaurantId) return;

    setSavingCategories(true);
    try {
      const { data } = await restaurantApi.updateRestaurantCategories(restaurantId, {
        categories,
        reassignments,
      });
      setRestaurantCategories(data.categories || []);
      setFilterCat((currentCategory) => (currentCategory === 'All' || (data.categories || []).includes(currentCategory) ? currentCategory : 'All'));
      setForm((currentForm) => ({
        ...currentForm,
        category: (data.categories || []).includes(currentForm.category)
          ? currentForm.category
          : (data.categories || [])[0] || '',
      }));
      await reloadFoods();
      toast.success('Categories updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) {
      toast.error('Enter a category name');
      return;
    }
    if (categoryOptions.some((category) => category.toLowerCase() === trimmedCategory.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    await persistCategories([...restaurantCategories, trimmedCategory]);
    setNewCategory('');
  };

  const handleRenameCategory = async (oldCategory) => {
    const nextCategory = editingCategoryValue.trim();
    if (!nextCategory) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (
      nextCategory.toLowerCase() !== oldCategory.toLowerCase()
      && categoryOptions.some((category) => category.toLowerCase() === nextCategory.toLowerCase())
    ) {
      toast.error('Category already exists');
      return;
    }

    const nextCategories = restaurantCategories.map((category) => category === oldCategory ? nextCategory : category);
    const reassignments = getCategoryUsageCount(oldCategory) > 0 && nextCategory !== oldCategory
      ? { [oldCategory]: nextCategory }
      : {};

    await persistCategories(nextCategories, reassignments);
    setEditingCategory(null);
    setEditingCategoryValue('');
  };

  const handleDeleteCategory = async () => {
    if (!categoryDeleteState) return;

    const { category, replacement } = categoryDeleteState;
    if (restaurantCategories.length === 1) {
      toast.error('At least one category is required');
      return;
    }

    const nextCategories = restaurantCategories.filter((item) => item !== category);
    const usageCount = getCategoryUsageCount(category);
    const reassignments = usageCount > 0 ? { [category]: replacement } : {};

    await persistCategories(nextCategories, reassignments);
    setCategoryDeleteState(null);
  };

  const handleCategoryDrop = async (targetCategory) => {
    if (!draggedCategory || draggedCategory === targetCategory) return;

    const nextCategories = [...restaurantCategories];
    const draggedIndex = nextCategories.indexOf(draggedCategory);
    const targetIndex = nextCategories.indexOf(targetCategory);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [movedCategory] = nextCategories.splice(draggedIndex, 1);
    nextCategories.splice(targetIndex, 0, movedCategory);
    setDraggedCategory(null);
    await persistCategories(nextCategories);
  };

  if (loading) return <Loading message="Loading menu..." />;

  if (noRestaurant) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Restaurant Found</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Create your restaurant profile first to manage your menu.
        </p>
        <Link to="/restaurant/settings" className="btn-primary" style={{ textDecoration: 'none' }}>
          Create Restaurant
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Menu Management</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{foods.length} item{foods.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem' }}>
          <HiOutlinePlus size={18} /> Add Item
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Manage Categories</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Add, rename, drag to reorder, or safely reassign categories used by menu items.
            </p>
          </div>
          {savingCategories && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>Saving...</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {restaurantCategories.map((category) => {
            const usageCount = getCategoryUsageCount(category);
            const replacementOptions = restaurantCategories.filter((item) => item !== category);

            return (
              <div
                key={category}
                draggable
                onDragStart={() => setDraggedCategory(category)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleCategoryDrop(category)}
                style={{
                  minWidth: '220px',
                  padding: '0.75rem',
                  borderRadius: '0.85rem',
                  border: draggedCategory === category ? '1px dashed var(--color-primary)' : '1px solid var(--color-border)',
                  background: 'var(--color-bg-input)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>↕ Drag</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{usageCount} item{usageCount !== 1 ? 's' : ''}</span>
                </div>

                {editingCategory === category ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input-field"
                      value={editingCategoryValue}
                      onChange={(e) => setEditingCategoryValue(e.target.value)}
                      style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    />
                    <button type="button" className="btn-primary" style={{ padding: '0.55rem 0.85rem', fontSize: '0.75rem' }} onClick={() => handleRenameCategory(category)}>
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.65rem' }}>{category}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', flex: 1 }}
                        onClick={() => {
                          setEditingCategory(category);
                          setEditingCategoryValue(category);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', flex: 1 }}
                        onClick={() => {
                          if (restaurantCategories.length === 1) {
                            toast.error('At least one category is required');
                            return;
                          }
                          setCategoryDeleteState({
                            category,
                            replacement: replacementOptions[0] || '',
                            usageCount,
                          });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category, e.g. Dosa or Rice Items"
            style={{ maxWidth: '360px', flex: '1 1 260px' }}
          />
          <button type="button" className="btn-primary" onClick={handleAddCategory} disabled={savingCategories}>
            Add Category
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: '300px', flex: 1 }}>
          <HiOutlineSearch size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input-field" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['All', ...categoryOptions].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={{
              padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              ...(filterCat === cat ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'name_az', label: '🔤 A → Z' },
          { key: 'name_za', label: '🔤 Z → A' },
          { key: 'price_high', label: '💰 Price ↓' },
          { key: 'price_low', label: '💰 Price ↑' },
          { key: 'avail_high', label: '📦 Stock ↓' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
              fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              ...(sortBy === opt.key
                ? { background: 'rgba(249,115,22,0.15)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      {filtered.length === 0 ? (
        <EmptyState icon="🍽️" title="No items found" message="Add your first menu item to get started." action={
          <button onClick={openAddModal} className="btn-primary">Add Item</button>
        } />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map((food, i) => (
            <div key={food._id} className="card animate-fade-in" style={{
              animationDelay: `${i * 0.03}s`, display: 'flex', gap: '1rem', alignItems: 'center',
              opacity: food.isAvailable === false ? 0.5 : 1,
            }}>
              {/* Image */}
              <div
                onClick={() => food.image && setLightboxImage(food.image)}
                style={{
                  width: '70px', height: '70px', borderRadius: '0.75rem', flexShrink: 0, overflow: 'hidden',
                  background: food.image ? `url(${food.image}) center / cover` : 'linear-gradient(135deg, #ffecd2, #fcb69f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: food.image ? 'pointer' : 'default',
                }}
                title={food.image ? 'Click to enlarge' : undefined}
              >
                {!food.image && <IoFastFoodOutline size={24} style={{ color: 'rgba(0,0,0,0.15)' }} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '3px',
                    border: `2px solid ${food.isVeg ? '#22c55e' : '#ef4444'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: food.isVeg ? '#22c55e' : '#ef4444' }} />
                  </span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {food.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatPrice(food.price)}</span>
                  <span className="badge" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                    {food.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Qty:</span>
                    <input 
                      type="number" 
                      min="0"
                      value={quickEditQty[food._id] !== undefined ? quickEditQty[food._id] : food.availableQuantity}
                      onChange={(e) => setQuickEditQty({ ...quickEditQty, [food._id]: e.target.value })}
                      style={{ 
                        width: '54px', padding: '0.25rem 0.375rem', fontSize: '0.85rem', 
                        border: '1px solid var(--color-border)', borderRadius: '4px',
                        background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
                        textAlign: 'center'
                      }}
                    />
                    {quickEditQty[food._id] !== undefined && quickEditQty[food._id] !== String(food.availableQuantity) && (
                      <button 
                        onClick={() => handleQuickUpdateQuantity(food._id, quickEditQty[food._id])}
                        style={{ 
                          padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600,
                          background: 'var(--color-primary)', color: '#fff', border: 'none', 
                          borderRadius: '4px', cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button onClick={() => handleToggleAvailability(food)} style={{
                  padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 600,
                  border: '1px solid', cursor: 'pointer',
                  background: food.isAvailable !== false ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  borderColor: food.isAvailable !== false ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  color: food.isAvailable !== false ? '#22c55e' : '#ef4444',
                }}>
                  {food.isAvailable !== false ? 'Available' : 'Unavailable'}
                </button>
                <button onClick={() => openEditModal(food)} style={{
                  width: '32px', height: '32px', borderRadius: '0.5rem',
                  background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HiOutlinePencil size={14} />
                </button>
                <button onClick={() => setDeleteConfirm(food._id)} style={{
                  width: '32px', height: '32px', borderRadius: '0.5rem',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: 'var(--color-error)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HiOutlineTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Item' : 'Add Menu Item'} maxWidth="480px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Description</label>
            <textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the dish..." rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Price (₹) *</label>
              <input className="input-field" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="249" required min="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Default Qty</label>
              <input className="input-field" type="number" value={form.defaultQuantity} onChange={(e) => setForm({ ...form, defaultQuantity: e.target.value })} min="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Current Qty</label>
              <input className="input-field" type="number" value={form.availableQuantity} onChange={(e) => setForm({ ...form, availableQuantity: e.target.value })} min="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Category</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {[{ v: true, label: '🟢 Veg' }, { v: false, label: '🔴 Non-Veg' }].map((t) => (
                  <button key={String(t.v)} type="button" onClick={() => setForm({ ...form, isVeg: t.v })} style={{
                    flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
                    border: '1px solid', cursor: 'pointer',
                    ...(form.isVeg === t.v ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                      : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Image</label>
            {imagePreview && (
              <div style={{ marginBottom: '0.5rem', position: 'relative', width: '100%', height: '120px', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} style={{
                  position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
              style={{
                width: '100%', padding: '0.5rem', fontSize: '0.85rem',
                background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
                borderRadius: '0.5rem', color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!categoryDeleteState}
        onClose={() => setCategoryDeleteState(null)}
        title="Delete Category"
        maxWidth="440px"
      >
        {categoryDeleteState && (
          <div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              {categoryDeleteState.usageCount > 0
                ? `"${categoryDeleteState.category}" is used by ${categoryDeleteState.usageCount} menu item${categoryDeleteState.usageCount !== 1 ? 's' : ''}. Choose a category to move those items before deleting it.`
                : `Delete "${categoryDeleteState.category}" from your restaurant categories?`}
            </p>

            {categoryDeleteState.usageCount > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                  Reassign foods to
                </label>
                <select
                  className="input-field"
                  value={categoryDeleteState.replacement}
                  onChange={(e) => setCategoryDeleteState((currentState) => ({
                    ...currentState,
                    replacement: e.target.value,
                  }))}
                >
                  {restaurantCategories.filter((category) => category !== categoryDeleteState.category).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setCategoryDeleteState(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteCategory} disabled={savingCategories}>Delete Category</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Item" maxWidth="400px">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗑️</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Are you sure you want to delete this menu item?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
};

export default MenuManagement;
