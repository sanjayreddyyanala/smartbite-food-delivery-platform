import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';

const DashboardLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, paddingTop: '64px' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          padding: '2rem',
          maxWidth: 'calc(100% - 260px)',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
