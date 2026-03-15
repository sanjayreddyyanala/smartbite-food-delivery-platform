import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import useSocketStore from './store/useSocketStore';
import useNotificationListener from './hooks/useNotificationListener';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Common
import ProtectedRoute from './components/common/ProtectedRoute';
import Loading from './components/common/Loading';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import PendingApproval from './pages/auth/PendingApproval';

// Public / Customer Pages
import HomePage from './pages/HomePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import PendingApprovals from './pages/admin/PendingApprovals';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDeliveryPartners from './pages/admin/ManageDeliveryPartners';
import ManageNGOs from './pages/admin/ManageNGOs';
import ManageRestaurants from './pages/admin/ManageRestaurants';
import ManageOrders from './pages/admin/ManageOrders';
import LeftoverClaims from './pages/admin/LeftoverClaims';

// Customer Pages
import RestaurantListing from './pages/customer/RestaurantListing';
import RestaurantDetail from './pages/customer/RestaurantDetail';
import CartPage from './pages/customer/CartPage';
import AddressManager from './pages/customer/AddressManager';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderHistory from './pages/customer/OrderHistory';
import OrderDetail from './pages/customer/OrderDetail';

// Restaurant Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import MenuManagement from './pages/restaurant/MenuManagement';
import LiveOrders from './pages/restaurant/LiveOrders';
import RestaurantOrderHistory from './pages/restaurant/RestaurantOrderHistory';
import LeftoverFoodManagement from './pages/restaurant/LeftoverFoodManagement';
import RestaurantSettings from './pages/restaurant/RestaurantSettings';
import RestaurantEarnings from './pages/restaurant/EarningsDashboard';

// Delivery Pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import AvailableOrders from './pages/delivery/AvailableOrders';
import ActiveDelivery from './pages/delivery/ActiveDelivery';
import DeliveryHistory from './pages/delivery/DeliveryHistory';
import DeliveryProfile from './pages/delivery/DeliveryProfile';
import DeliveryEarnings from './pages/delivery/EarningsDashboard';

// NGO Pages
import NGODashboard from './pages/ngo/NGODashboard';
import AvailableFood from './pages/ngo/AvailableFood';
import ClaimedFood from './pages/ngo/ClaimedFood';

// Group Ordering Pages
import GroupOrderLanding from './pages/group/GroupOrderLanding';
import CreateGroupOrder from './pages/group/CreateGroupOrder';
import JoinGroupOrder from './pages/group/JoinGroupOrder';
import GroupOrderRoom from './pages/group/GroupOrderRoom';
import GroupCheckout from './pages/group/GroupCheckout';

import { ROLES } from './constants';

function App() {
  const { user, token, loading, loadUser } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && token) {
      connect(token, user._id);
    } else if (!user && !loading) {
      disconnect();
    }
  }, [user, token, loading, connect, disconnect]);

  // Mount real-time notification listener
  useNotificationListener();

  if (loading) return <Loading message="Loading FoodDash..." />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        containerStyle={{ top: 72 }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* ===== Auth Routes (no navbar) ===== */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* ===== Main Layout (Navbar, no sidebar) ===== */}
        <Route element={<MainLayout />}>
          {/* Home — redirect non-customer roles to their dashboards */}
          <Route path="/" element={
            user?.role === 'restaurant' ? <Navigate to="/restaurant/dashboard" replace /> :
            user?.role === 'delivery' ? <Navigate to="/delivery/dashboard" replace /> :
            user?.role === 'ngo' ? <Navigate to="/ngo/dashboard" replace /> :
            user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
            <HomePage />
          } />

          {/* Restaurant Browsing */}
          <Route path="/restaurants" element={<RestaurantListing />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />

          {/* Customer — Cart, Checkout, Orders, Addresses */}
          <Route path="/cart" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <CartPage />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <OrderHistory />
            </ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <OrderDetail />
            </ProtectedRoute>
          } />
          <Route path="/addresses" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <AddressManager />
            </ProtectedRoute>
          } />
          
          {/* Phase 9 - Group Ordering Routes */}
          <Route path="/group" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <GroupOrderLanding />
            </ProtectedRoute>
          } />
          <Route path="/group/create" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <CreateGroupOrder />
            </ProtectedRoute>
          } />
          <Route path="/group/create/:restaurantId" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <CreateGroupOrder />
            </ProtectedRoute>
          } />
          <Route path="/group/join" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <JoinGroupOrder />
            </ProtectedRoute>
          } />
          <Route path="/group/join/:inviteCode" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <JoinGroupOrder />
            </ProtectedRoute>
          } />
          <Route path="/group/room/:code" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <GroupOrderRoom />
            </ProtectedRoute>
          } />
          <Route path="/group/checkout/:code" element={
            <ProtectedRoute roles={ROLES.CUSTOMER}>
              <GroupCheckout />
            </ProtectedRoute>
          } />
        </Route>

        {/* ===== Restaurant Dashboard ===== */}
        <Route element={
          <ProtectedRoute roles={ROLES.RESTAURANT} requireApproval>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
          <Route path="/restaurant/menu" element={<MenuManagement />} />
          <Route path="/restaurant/orders" element={<LiveOrders />} />
          <Route path="/restaurant/history" element={<RestaurantOrderHistory />} />
          <Route path="/restaurant/leftover" element={<LeftoverFoodManagement />} />
          <Route path="/restaurant/settings" element={<RestaurantSettings />} />
          <Route path="/restaurant/earnings" element={<RestaurantEarnings />} />
        </Route>

        {/* ===== Delivery Dashboard ===== */}
        <Route element={
          <ProtectedRoute roles={ROLES.DELIVERY} requireApproval>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
          <Route path="/delivery/available" element={<AvailableOrders />} />
          <Route path="/delivery/active/:id" element={<ActiveDelivery />} />
          <Route path="/delivery/history" element={<DeliveryHistory />} />
          <Route path="/delivery/profile" element={<DeliveryProfile />} />
          <Route path="/delivery/earnings" element={<DeliveryEarnings />} />
        </Route>

        {/* ===== NGO Dashboard ===== */}
        <Route element={
          <ProtectedRoute roles={ROLES.NGO} requireApproval>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/ngo/dashboard" element={<NGODashboard />} />
          <Route path="/ngo/available" element={<AvailableFood />} />
          <Route path="/ngo/claimed" element={<ClaimedFood />} />
        </Route>

        {/* ===== Admin Dashboard ===== */}
        <Route element={
          <ProtectedRoute roles={ROLES.ADMIN}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/pending" element={<PendingApprovals />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/delivery-partners" element={<ManageDeliveryPartners />} />
          <Route path="/admin/ngos" element={<ManageNGOs />} />
          <Route path="/admin/restaurants" element={<ManageRestaurants />} />
          <Route path="/admin/orders" element={<ManageOrders />} />
          <Route path="/admin/leftover-claims" element={<LeftoverClaims />} />
        </Route>

        {/* ===== Catch-all 404 ===== */}
        <Route path="*" element={
          <MainLayout />
        }>
          <Route path="*" element={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Page Not Found</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>The page you're looking for doesn't exist.</p>
              <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>Go Home</a>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
