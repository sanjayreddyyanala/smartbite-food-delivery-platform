import { useState, useEffect, useMemo } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineInformationCircle,
  HiOutlineArrowNarrowUp,
  HiOutlineArrowNarrowDown,
  HiOutlineTruck,
} from 'react-icons/hi';
import { IoWalletOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import * as deliveryApi from '../../api/delivery.api';
import Loading from '../../components/common/Loading';

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtShort = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const periodConfigs = [
  { key: 'today', label: 'Today',     days: 1   },
  { key: '7d',    label: '7 Days',    days: 7   },
  { key: '30d',   label: '30 Days',   days: 30  },
  { key: '90d',   label: '90 Days',   days: 90  },
  { key: '1y',    label: 'This Year', days: 365 },
  { key: 'all',   label: 'All Time',  days: null },
];

function getPeriodRange(days) {
  const now = new Date();
  if (!days) return { from: new Date(0), to: now };

  if (days === 1) {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  const from = new Date(now);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

function filterDeliveries(deliveries, from, to) {
  return deliveries.filter((d) => {
    const dt = new Date(d.deliveredAt || d.createdAt);
    return dt >= from && dt <= to;
  });
}

function buildChartBuckets(deliveries, periodKey) {
  if (!deliveries.length) return [];

  const sorted = [...deliveries].sort(
    (a, b) => new Date(a.deliveredAt || a.createdAt) - new Date(b.deliveredAt || b.createdAt)
  );

  const granularity =
    periodKey === 'today' ? 'hour'
    : periodKey === '7d'  ? 'day'
    : periodKey === '30d' ? 'day'
    : periodKey === '90d' ? 'week'
    : 'month';

  const buckets = {};
  for (const d of sorted) {
    const dt = new Date(d.deliveredAt || d.createdAt);
    let key = '';
    if (granularity === 'hour')  key = `${dt.getHours()}:00`;
    else if (granularity === 'day') key = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    else if (granularity === 'week') {
      const wn = Math.ceil((dt.getDate() + new Date(dt.getFullYear(), dt.getMonth(), 1).getDay()) / 7);
      key = `W${wn} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`;
    } else {
      key = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    if (!buckets[key]) buckets[key] = { label: key, earnings: 0, deliveries: 0 };
    buckets[key].earnings   += d.deliveryFee || 0;
    buckets[key].deliveries += 1;
  }

  return Object.values(buckets);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, color, label, value, sub }) {
  return (
    <div
      className="card"
      style={{
        flex: '1 1 200px',
        borderLeft: `3px solid ${color}`,
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: '12px',
          background: `${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

function CompareCard({ label, current, previous, formatter = fmt, unit = '' }) {
  const diff = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const up = diff >= 0;
  return (
    <div className="card" style={{ flex: '1 1 160px', padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatter(current)}{unit}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
        {up
          ? <HiOutlineArrowNarrowUp size={14} style={{ color: '#22c55e' }} />
          : <HiOutlineArrowNarrowDown size={14} style={{ color: '#ef4444' }} />
        }
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: up ? '#22c55e' : '#ef4444' }}>
          {Math.abs(diff).toFixed(1)}%
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>vs prev period</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
        Prev: {formatter(previous)}{unit}
      </div>
    </div>
  );
}

function BarChart({ buckets, dataKey = 'earnings', color = '#22c55e', formatter = fmtShort }) {
  if (!buckets.length)
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        No data to display
      </div>
    );

  const max = Math.max(...buckets.map((b) => b[dataKey]));

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '6px',
          minWidth: buckets.length > 15 ? `${buckets.length * 44}px` : '100%',
          height: '180px',
          padding: '0 0.5rem',
        }}
      >
        {buckets.map((b, i) => {
          const pct = max > 0 ? (b[dataKey] / max) * 100 : 0;
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '32px' }}
              title={`${b.label}: ${formatter(b[dataKey])}`}
            >
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {formatter(b[dataKey])}
              </div>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '120px' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(pct, 2)}%`,
                    background: `linear-gradient(to top, ${color}, ${color}88)`,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '0.6rem', color: 'var(--color-text-muted)',
                  textAlign: 'center', whiteSpace: 'nowrap',
                  overflow: 'hidden', maxWidth: '48px', textOverflow: 'ellipsis',
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak / performance badge ──────────────────────────────────────────────
function PerformanceBadge({ deliveries }) {
  // Check consecutive days active
  const days = new Set(
    deliveries.map((d) => new Date(d.deliveredAt || d.createdAt).toDateString())
  );
  const streak = days.size;
  const label =
    streak >= 25 ? '🔥 Elite'
    : streak >= 15 ? '⚡ Active'
    : streak >= 7 ? '✅ Consistent'
    : streak >= 1 ? '🚀 Getting started'
    : null;
  if (!label) return null;
  return (
    <span
      style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        background: 'rgba(249,115,22,0.12)',
        color: '#f97316',
        border: '1px solid rgba(249,115,22,0.25)',
      }}
    >
      {label} · {streak} active day{streak !== 1 ? 's' : ''}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const DeliveryEarningsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [chartMode, setChartMode] = useState('earnings'); // earnings | deliveries
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const { data: res } = await deliveryApi.getEarnings();
      setData(res);
    } catch {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  // ── derived data ────────────────────────────────────────────────────────────
  const allDeliveries = data?.recentDeliveries || [];

  const { currentDeliveries, previousDeliveries, buckets } = useMemo(() => {
    if (!allDeliveries.length)
      return { currentDeliveries: [], previousDeliveries: [], buckets: [] };

    const cfg = periodConfigs.find((p) => p.key === period);
    const { from: curFrom, to: curTo } = getPeriodRange(cfg.days);
    const curDels = filterDeliveries(allDeliveries, curFrom, curTo);

    let prevDels = [];
    if (cfg.days) {
      const prevTo = new Date(curFrom);
      const prevFrom = new Date(curFrom);
      prevFrom.setDate(prevFrom.getDate() - cfg.days);
      prevDels = filterDeliveries(allDeliveries, prevFrom, prevTo);
    }

    const buckets = buildChartBuckets(curDels, period);
    return { currentDeliveries: curDels, previousDeliveries: prevDels, buckets };
  }, [allDeliveries, period]);

  const currentEarnings  = useMemo(() => currentDeliveries.reduce((s, d) => s + (d.deliveryFee || 0), 0), [currentDeliveries]);
  const previousEarnings = useMemo(() => previousDeliveries.reduce((s, d) => s + (d.deliveryFee || 0), 0), [previousDeliveries]);
  const avgPerDelivery   = currentDeliveries.length ? currentEarnings / currentDeliveries.length : 0;
  const prevAvgDel       = previousDeliveries.length ? previousEarnings / previousDeliveries.length : 0;

  // Daily earnings rate (for selected period)
  const cfg = periodConfigs.find((p) => p.key === period);
  const dailyRate = cfg?.days && currentDeliveries.length
    ? currentEarnings / cfg.days
    : null;

  // ── table rows ──────────────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    let rows = [...currentDeliveries];

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((d) => (d.restaurant?.name || '').toLowerCase().includes(s));
    }

    rows.sort((a, b) => {
      const da = new Date(a.deliveredAt || a.createdAt);
      const db = new Date(b.deliveredAt || b.createdAt);
      if (sortBy === 'date_desc') return db - da;
      if (sortBy === 'date_asc')  return da - db;
      if (sortBy === 'fee_desc') return (b.deliveryFee || 0) - (a.deliveryFee || 0);
      if (sortBy === 'fee_asc')  return (a.deliveryFee || 0) - (b.deliveryFee || 0);
      return 0;
    });

    return rows;
  }, [currentDeliveries, search, sortBy]);

  const totalPages  = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const pagedRows   = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── insights ────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!currentDeliveries.length) return [];
    const list = [];

    const diff = previousEarnings > 0 ? ((currentEarnings - previousEarnings) / previousEarnings) * 100 : null;
    if (diff !== null) {
      list.push({
        icon: diff >= 0 ? HiOutlineTrendingUp : HiOutlineTrendingDown,
        color: diff >= 0 ? '#22c55e' : '#ef4444',
        text: `Earnings are ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(1)}% compared to the previous period.`,
      });
    }

    if (buckets.length > 1) {
      const best = buckets.reduce((a, b) => (b.earnings > a.earnings ? b : a));
      list.push({
        icon: HiOutlineChartBar,
        color: '#22c55e',
        text: `Best earning period: "${best.label}" with ${fmtShort(best.earnings)} from ${best.deliveries} deliveries.`,
      });
    }

    if (avgPerDelivery > 0) {
      list.push({
        icon: HiOutlineTruck,
        color: '#60a5fa',
        text: `Average earning per delivery is ${fmt(avgPerDelivery)} for the selected period.`,
      });
    }

    if (dailyRate !== null) {
      list.push({
        icon: HiOutlineCurrencyRupee,
        color: '#a78bfa',
        text: `Average daily earnings rate: ${fmt(dailyRate)}/day over the selected period.`,
      });
    }

    return list;
  }, [currentDeliveries, buckets, currentEarnings, previousEarnings, avgPerDelivery, dailyRate]);

  // ────────────────────────────────────────────────────────────────────────────
  if (loading) return <Loading message="Loading earnings..." />;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>Earnings Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Track your delivery earnings and payouts</p>
            <PerformanceBadge deliveries={allDeliveries} />
          </div>
        </div>
        <button
          onClick={fetchEarnings}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <HiOutlineRefresh size={16} /> Refresh
        </button>
      </div>

      {/* ── Lifetime summary cards ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <SummaryCard
          icon={HiOutlineCurrencyRupee}
          color="#22c55e"
          label="Total Earnings (Lifetime)"
          value={fmt(data?.totalEarnings)}
          sub="All-time delivery fee earnings"
        />
        <SummaryCard
          icon={IoWalletOutline}
          color="#ef4444"
          label="Unsettled Amount"
          value={fmt(data?.unsettledEarnings)}
          sub="Pending payout from admin"
        />
        <SummaryCard
          icon={HiOutlineClipboardList}
          color="#60a5fa"
          label="Total Paid Out"
          value={fmt(data?.totalPaidOut)}
          sub={data?.lastPayoutAt ? `Last: ${fmtDate(data.lastPayoutAt)}` : 'No payouts yet'}
        />
        <SummaryCard
          icon={HiOutlineTruck}
          color="#a78bfa"
          label="Total Deliveries"
          value={data?.totalDeliveries || 0}
          sub="All-time completed deliveries"
        />
      </div>

      {/* ── Period filter tabs ── */}
      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
      >
        <HiOutlineCalendar size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>Period:</span>
        {periodConfigs.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setPage(1); }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '2rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: period === p.key ? '#22c55e' : 'var(--color-bg-secondary)',
              color: period === p.key ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Period stats ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            Earnings ({periodConfigs.find((p) => p.key === period)?.label})
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{fmt(currentEarnings)}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            Deliveries ({periodConfigs.find((p) => p.key === period)?.label})
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentDeliveries.length}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            Avg per Delivery
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fmt(avgPerDelivery)}</div>
        </div>
        {dailyRate !== null && (
          <div className="card" style={{ flex: '1 1 180px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
              Daily Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fmt(dailyRate)}</div>
          </div>
        )}
      </div>

      {/* ── Comparison ── */}
      {period !== 'all' && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Period Comparison — Current vs Previous
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <CompareCard label="Earnings" current={currentEarnings} previous={previousEarnings} />
            <CompareCard label="Deliveries" current={currentDeliveries.length} previous={previousDeliveries.length} formatter={(v) => String(v)} unit=" trips" />
            <CompareCard label="Avg per Delivery" current={avgPerDelivery} previous={prevAvgDel} />
          </div>
        </div>
      )}

      {/* ── Bar Chart ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            <HiOutlineChartBar size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Earnings Chart
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'earnings',   label: 'Earnings'   },
              { key: 'deliveries', label: 'Deliveries' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setChartMode(m.key)}
                style={{
                  padding: '0.25rem 0.7rem',
                  borderRadius: '2rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: chartMode === m.key ? '#22c55e' : 'var(--color-bg-secondary)',
                  color: chartMode === m.key ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <BarChart
          buckets={buckets}
          dataKey={chartMode}
          color={chartMode === 'earnings' ? '#22c55e' : '#60a5fa'}
          formatter={chartMode === 'earnings' ? fmtShort : (v) => String(v)}
        />
      </div>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            <HiOutlineInformationCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {insights.map((ins, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  background: `${ins.color}11`,
                  borderRadius: '0.5rem',
                  borderLeft: `3px solid ${ins.color}`,
                }}
              >
                <ins.icon size={16} style={{ color: ins.color, flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delivery history table ── */}
      <div className="card">
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            <HiOutlineClock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Delivery Log
            <span
              style={{
                marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600,
                background: 'var(--color-bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '2rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {tableRows.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search restaurant…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '0.82rem', outline: 'none', width: '180px',
              }}
            />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="fee_desc">Highest Fee</option>
              <option value="fee_asc">Lowest Fee</option>
            </select>
          </div>
        </div>

        {pagedRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No deliveries found for the selected period.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {['Date & Time', 'Order ID', 'Restaurant', 'Order Value', 'Delivery Fee'].map((h) => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((d, i) => (
                    <tr
                      key={d._id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-secondary)',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(d.deliveredAt || d.createdAt)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        #{(d._id || '').slice(-8).toUpperCase()}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>
                        {d.restaurant?.name || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {fmt(d.totalAmount)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#22c55e' }}>
                        {fmt(d.deliveryFee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginTop: '1rem', flexWrap: 'wrap',
                }}
              >
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.4rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                    color: page === 1 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem',
                  }}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                  const pg = totalPages <= 7 ? idx + 1 : (page <= 4 ? idx + 1 : page - 3 + idx);
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        padding: '0.35rem 0.6rem', borderRadius: '0.4rem',
                        border: '1px solid var(--color-border)',
                        background: pg === page ? '#22c55e' : 'var(--color-bg-secondary)',
                        color: pg === page ? '#fff' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontSize: '0.82rem', minWidth: '32px',
                      }}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.4rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                    color: page === totalPages ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.82rem',
                  }}
                >
                  Next →
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Page {page} of {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default DeliveryEarningsDashboard;
