import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Package,
  ClipboardList,
  FileCheck,
  ClipboardCheck,
  Users,
  ArrowRight,
  ArrowUpRight,
  Search,
  LogOut,
  LayoutGrid,
  Clock,
  TrendingUp,
  Zap,
  Sparkles,
  CheckCircle2,
  CircleDot,
  Plus,
  Sun,
  ChevronRight,
} from 'lucide-react';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import { fetchWorkOrders } from '../utils/workorders';
import { fetchInstallationsPage } from '../utils/installations';
import { getAllJCRDrafts } from '../utils/jcrStorage';
import './Dashboard.css';

/* ------------------------------------------------------------------ */
/*  Static config                                                      */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'jcrTracking', label: 'Work Order Tracking', icon: ClipboardList },
  { key: 'workOrders', label: 'Work Orders', icon: Package },
  { key: 'installations', label: 'Installations', icon: ClipboardList },
  { key: 'jcr', label: 'JCR', icon: FileCheck },
  { key: 'jcrSelect', label: 'JCR Select', icon: FileCheck },
  { key: 'pdi', label: 'PDI', icon: ClipboardCheck },
  { key: 'letterGenerator', label: 'Letters', icon: Mail },
  { key: 'users', label: 'Users', icon: Users },
];

const TOOLS = [
  {
    key: 'jcrTracking',
    title: 'Work Order Tracking',
    description: 'Work Order Book - Track all work orders, upload files, add comments and export Excel/PDF.',
    icon: ClipboardList,
    accent: 'emerald',
    tag: 'Tracking',
  },
  {
    key: 'workOrders',
    title: 'Work Orders',
    description: 'Create, track and manage equipment serials across every project.',
    icon: Package,
    accent: 'blue',
    tag: 'Operations',
  },
  {
    key: 'installations',
    title: 'Installations',
    description: 'Browse the site register, geo-tagged photos and commissioning data.',
    icon: ClipboardList,
    accent: 'teal',
    tag: 'Field',
  },
  {
    key: 'jcr',
    title: 'JCR',
    description: 'Build a Joint Commissioning Report and export a clean PDF.',
    icon: FileCheck,
    accent: 'indigo',
    tag: 'Reports',
  },
  {
    key: 'jcrSelect',
    title: 'JCR Select',
    description: 'Start a JCR pre-filled from an existing work order.',
    icon: FileCheck,
    accent: 'violet',
    tag: 'Reports',
  },
  {
    key: 'pdi',
    title: 'PDI',
    description: 'Run a Pre-Dispatch Inspection checklist before shipping.',
    icon: ClipboardCheck,
    accent: 'amber',
    tag: 'Quality',
  },
  {
    key: 'letterGenerator',
    title: 'Letters',
    description: 'Generate branded, print-ready letters from saved templates.',
    icon: Mail,
    accent: 'rose',
    tag: 'Documents',
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage team members, roles and access to the workspace.',
    icon: Users,
    accent: 'slate',
    tag: 'Admin',
  },
];

const QUICK_ACTIONS = [
  { key: 'jcrTracking', label: 'Work Order Tracking', icon: ClipboardList },
  { key: 'workOrders', label: 'New Work Order', icon: Package },
  { key: 'jcr', label: 'New JCR', icon: FileCheck },
  { key: 'pdi', label: 'Run PDI', icon: ClipboardCheck },
  { key: 'letterGenerator', label: 'Write a Letter', icon: Mail },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

/* Count-up hook for the stat numbers */
function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, label, value, hint, accent, loading, delay }) {
  const count = useCountUp(loading ? 0 : value, 900);
  return (
    <div
      className={`stat-card accent-${accent}`}
      style={{ '--delay': `${delay}ms` }}
    >
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={18} strokeWidth={2.2} />
        </span>
        {hint && (
          <span className="stat-hint">
            <TrendingUp size={12} />
            {hint}
          </span>
        )}
      </div>
      <div className="stat-value">
        {loading ? <span className="stat-skeleton" /> : count.toLocaleString()}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-glow" aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

function Dashboard({ onNavigate, onLogout }) {
  const [stats, setStats] = useState({
    workOrders: 0,
    installations: 0,
    jcrDrafts: 0,
    loading: true,
  });
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(new Date());

  // Current user name
  const userName = useMemo(() => {
    try {
      const u = getCurrentUser();
      return (u && (u.name || u.email)) || '';
    } catch {
      return '';
    }
  }, []);

  const firstName = userName ? userName.split(/[\s@]/)[0] : '';

  // Live clock (updates every minute, cheap)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Load live stats + recent activity
  useEffect(() => {
    let alive = true;
    (async () => {
      const activity = [];
      let workOrders = 0;
      let installations = 0;
      let jcrDrafts = 0;

      // JCR drafts come from localStorage — always available.
      try {
        const drafts = getAllJCRDrafts();
        jcrDrafts = drafts.length;
        drafts.slice(0, 4).forEach((d) => {
          activity.push({
            id: `jcr-${d.id}`,
            kind: 'JCR Draft',
            title: d.preview || 'Untitled JCR',
            at: d.savedAt,
            icon: FileCheck,
            accent: 'indigo',
            page: 'jcr',
          });
        });
      } catch {
        /* ignore */
      }

      // Work orders + installations may require Supabase; fail soft.
      try {
        const wos = await fetchWorkOrders();
        workOrders = wos.length;
        wos.slice(0, 4).forEach((w) => {
          activity.push({
            id: `wo-${w.id}`,
            kind: 'Work Order',
            title: w.name || 'Untitled',
            at: w.created_at,
            icon: Package,
            accent: 'blue',
            page: 'workOrders',
          });
        });
      } catch {
        /* offline / no table — keep zero */
      }

      try {
        const { count } = await fetchInstallationsPage({ page: 1, pageSize: 1 });
        installations = count || 0;
      } catch {
        /* ignore */
      }

      if (!alive) return;

      activity.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setRecent(activity.slice(0, 6));
      setStats({ workOrders, installations, jcrDrafts, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Filtered tools for the search box
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="dash">
      {/* Ambient animated background */}
      <div className="dash-bg" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="grid-overlay" />
      </div>

      {/* ============ Sidebar ============ */}
      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <Logo size="medium" />
          <div className="sidebar-brand-text">
            <strong>Sunfeed</strong>
            <span>Workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === 'dashboard';
            return (
              <button
                key={item.key}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => item.key !== 'dashboard' && onNavigate(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{(firstName || 'U').charAt(0).toUpperCase()}</span>
            <div className="sidebar-user-text">
              <strong>{userName || 'User'}</strong>
              <span>Signed in</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ============ Main ============ */}
      <main className="dash-main">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search tools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="topbar-meta">
            <span className="topbar-date">
              <Clock size={14} />
              {formatDate(now)}
            </span>
          </div>
        </div>

        {/* Hero */}
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <Sparkles size={14} />
              {greeting()}
            </span>
            <h1 className="hero-title">
              {firstName ? <>Welcome back, {firstName}.</> : <>Welcome back.</>}
              <br />
              <span className="hero-gradient">What are we building today?</span>
            </h1>
            <p className="hero-sub">
              Your solar operations hub — work orders, installations, inspections
              and commissioning reports, all in one calm place.
            </p>

            <div className="hero-actions">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.key}
                    className="quick-action"
                    onClick={() => onNavigate(a.key)}
                  >
                    <Icon size={16} />
                    {a.label}
                    <Plus size={13} className="qa-plus" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-shine" aria-hidden="true" />
            <div className="hero-card-top">
              <span className="hero-card-badge">
                <Sun size={14} /> Live
              </span>
              <Zap size={16} className="hero-card-zap" />
            </div>
            <div className="hero-card-metric">
              <span className="hero-card-num">
                {stats.loading
                  ? '—'
                  : (stats.workOrders + stats.installations + stats.jcrDrafts).toLocaleString()}
              </span>
              <span className="hero-card-metric-label">records across your workspace</span>
            </div>
            <div className="hero-card-rows">
              <div className="hero-card-row">
                <CircleDot size={13} /> {stats.workOrders} work orders
              </div>
              <div className="hero-card-row">
                <CircleDot size={13} /> {stats.installations.toLocaleString()} installations
              </div>
              <div className="hero-card-row">
                <CircleDot size={13} /> {stats.jcrDrafts} JCR drafts
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stats-row">
          <StatCard
            icon={Package}
            label="Work Orders"
            value={stats.workOrders}
            accent="blue"
            loading={stats.loading}
            delay={0}
          />
          <StatCard
            icon={ClipboardList}
            label="Installations"
            value={stats.installations}
            accent="teal"
            loading={stats.loading}
            delay={80}
          />
          <StatCard
            icon={FileCheck}
            label="JCR Drafts"
            value={stats.jcrDrafts}
            accent="indigo"
            loading={stats.loading}
            delay={160}
          />
          <StatCard
            icon={CheckCircle2}
            label="Tools Ready"
            value={TOOLS.length}
            accent="amber"
            loading={false}
            delay={240}
          />
        </section>

        {/* Content split: tools + activity */}
        <div className="content-split">
          {/* Tools */}
          <section className="tools-section">
            <div className="section-head">
              <h2>Workspaces</h2>
              <span className="section-sub">{filteredTools.length} available</span>
            </div>

            <div className="tools-grid">
              {filteredTools.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.key}
                    className={`tool-card accent-${tool.accent}`}
                    style={{ '--delay': `${i * 55}ms` }}
                    onClick={() => onNavigate(tool.key)}
                  >
                    <div className="tool-card-head">
                      <span className="tool-icon">
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <span className="tool-tag">{tool.tag}</span>
                    </div>
                    <h3 className="tool-title">{tool.title}</h3>
                    <p className="tool-desc">{tool.description}</p>
                    <span className="tool-open">
                      Open <ArrowRight size={15} />
                    </span>
                    <span className="tool-sheen" aria-hidden="true" />
                  </button>
                );
              })}

              {filteredTools.length === 0 && (
                <div className="tools-empty">
                  <Search size={22} />
                  <p>No tools match “{query}”.</p>
                </div>
              )}
            </div>
          </section>

          {/* Activity */}
          <section className="activity-section">
            <div className="section-head">
              <h2>Recent activity</h2>
              <Clock size={15} className="section-head-icon" />
            </div>

            <div className="activity-list">
              {stats.loading && (
                <>
                  <div className="activity-skeleton" />
                  <div className="activity-skeleton" />
                  <div className="activity-skeleton" />
                </>
              )}

              {!stats.loading && recent.length === 0 && (
                <div className="activity-empty">
                  <Sparkles size={20} />
                  <p>Nothing yet. Create a work order or a JCR to get started.</p>
                </div>
              )}

              {!stats.loading &&
                recent.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`activity-item accent-${item.accent}`}
                      style={{ '--delay': `${i * 60}ms` }}
                      onClick={() => onNavigate(item.page)}
                    >
                      <span className="activity-icon">
                        <Icon size={15} />
                      </span>
                      <span className="activity-body">
                        <span className="activity-title">{item.title}</span>
                        <span className="activity-meta">
                          {item.kind} · {relativeTime(item.at)}
                        </span>
                      </span>
                      <ChevronRight size={15} className="activity-chevron" />
                    </button>
                  );
                })}
            </div>

            <button className="activity-cta" onClick={() => onNavigate('workOrders')}>
              Go to Work Orders
              <ArrowUpRight size={15} />
            </button>
          </section>
        </div>

        <footer className="dash-foot">
          <span>Sunfeed Ecosolutions · Solar Operations Suite</span>
          <span>v2.0</span>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
