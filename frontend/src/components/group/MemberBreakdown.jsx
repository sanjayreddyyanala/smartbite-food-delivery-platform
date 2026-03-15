import { formatPrice } from '../../utils/formatPrice';

const MemberBreakdown = ({ members, items, deliveryFee }) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const breakdown = members.map((member) => {
    const userId = String(member.user?._id || member.user || '');
    const memberItems = items.filter(
      (i) => String(i.addedBy?._id || i.addedBy || '') === userId
    );
    const itemsTotal = memberItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const feeShare = subtotal > 0 ? (itemsTotal / subtotal) * (deliveryFee || 0) : 0;

    return {
      name: member.name,
      itemsTotal: Math.round(itemsTotal * 100) / 100,
      deliveryFeeShare: Math.round(feeShare * 100) / 100,
      totalShare: Math.round((itemsTotal + feeShare) * 100) / 100,
    };
  }).filter((m) => m.itemsTotal > 0);

  if (breakdown.length === 0) return null;

  return (
    <div style={{
      padding: '1rem', borderRadius: '0.75rem',
      background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
    }}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700 }}>
        💰 Cost Split (informational)
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {breakdown.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.5rem 0.625rem', borderRadius: '0.5rem',
            background: 'var(--color-bg-input)',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{m.name}</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                Items: {formatPrice(m.itemsTotal)} + Delivery: {formatPrice(m.deliveryFeeShare)}
              </p>
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {formatPrice(m.totalShare)}
            </span>
          </div>
        ))}
      </div>

      <p style={{ margin: '0.625rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        This is for reference only — settle up with your friends outside the app.
      </p>
    </div>
  );
};

export default MemberBreakdown;
