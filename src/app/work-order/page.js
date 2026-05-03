"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./work-order.module.css";
import { FaArrowLeft, FaSuitcase, FaUserCircle, FaBuilding, FaTable, FaFilter, FaSortAmountDown, FaSearch } from "react-icons/fa";

// Helper for date display
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Function to get consistent color for a name
function getNameColor(name) {
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }; // Uniform Gray
}

export default function WorkOrderPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('deadline-asc');
  const [filterType, setFilterType] = useState('all'); // all, Custom, New Product

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/work-order");
      if (res.ok) {
        setWorkOrders(await res.json());
      }
    } catch (error) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const sortedOrders = [...workOrders]
    .filter(order => {
      // Search match
      const matchesSearch = 
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.assignees.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.inquiry_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || order.type === filterType;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'deadline-asc') return new Date(a.deadline) - new Date(b.deadline);
      if (sortOrder === 'deadline-desc') return new Date(b.deadline) - new Date(a.deadline);
      if (sortOrder === 'name-asc') return a.product_name.localeCompare(b.product_name);
      if (sortOrder === 'name-desc') return b.product_name.localeCompare(a.product_name);
      return 0;
    });

  return (
      <div className={styles.container}>
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <Link href="/dashboard" className={styles.backLink}>
                    <FaArrowLeft /> Back
                </Link>
                <h1>Perintah Kerja</h1>
            </div>
            <div className={styles.stats}>
                <span>Showing {sortedOrders.length} projects</span>
            </div>
        </header>

        {/* TOOLBAR */}
        <div className={styles.toolbar}>
           <div className={styles.toolsLeft}>
                <div className={styles.toolItem}>
                  <FaFilter className={styles.toolIcon} />
                  <select 
                    className={styles.toolSelect}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="Custom">Custom Order</option>
                    <option value="New Product">New Product</option>
                  </select>
                </div>
                <div className={styles.toolItem}>
                  <FaSortAmountDown className={styles.toolIcon} />
                  <select 
                    className={styles.toolSelect}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="deadline-asc">Deadline (Terdekat)</option>
                    <option value="deadline-desc">Deadline (Terjauh)</option>
                    <option value="name-asc">Nama (A-Z)</option>
                    <option value="name-desc">Nama (Z-A)</option>
                  </select>
                </div>
           </div>
           <div className={styles.searchBox}>
                <FaSearch />
                <input 
                    type="text" 
                    placeholder="Search by name, assignee, or job code..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
           </div>
        </div>

        {/* WORK ORDER TABLE */}
        <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>PJ Assignee</th>
                            <th>Product Details</th>
                            <th>Buyer / Brand</th>
                            <th>Job Code</th>
                            <th>Start Date</th>
                            <th>Deadline</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length > 0 ? sortedOrders.map((order, index) => (
                            <tr key={order.id}>
                                <td className={styles.indexCol}>{index + 1}</td>
                                <td>
                                    <div className={styles.badgeList}>
                                        {order.assignees.length > 0 ? order.assignees.map(a => {
                                            const colors = getNameColor(a.name);
                                            return (
                                                <span 
                                                    key={a.id} 
                                                    className={styles.badge}
                                                    style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                                                >
                                                    {a.name}
                                                </span>
                                            );
                                        }) : <span className={styles.unassigned}>Unassigned</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.productCell}>
                                        <Link href={`/product/${order.id}`} className={styles.productName}>
                                            {order.product_name}
                                        </Link>
                                        <span style={{
                                            fontSize: '0.65rem', 
                                            backgroundColor: order.type === 'Custom' ? '#fdf4ff' : '#eff6ff', 
                                            color: order.type === 'Custom' ? '#a21caf' : '#2563eb', 
                                            padding: '2px 8px', 
                                            borderRadius: '4px', 
                                            fontWeight: '700',
                                            border: `1px solid ${order.type === 'Custom' ? '#f5d0fe' : '#bfdbfe'}`,
                                            letterSpacing: '0.02em',
                                            alignSelf: 'flex-start',
                                            marginTop: '4px',
                                            marginBottom: '2px'
                                        }}>
                                            {order.type === 'Custom' ? 'Custom Order' : 'New Product'}
                                        </span>
                                        <p className={styles.descSnippet}>{order.description}</p>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.buyerBadge}>
                                        {order.buyer_name}
                                    </span>
                                </td>
                                <td>
                                    <code className={styles.jobCode}>{order.inquiry_code || 'N/A'}</code>
                                </td>
                                <td className={styles.dateCol}>{formatDate(order.startDate)}</td>
                                <td className={styles.dateCol}>
                                    <span className={new Date(order.deadline) < new Date() ? styles.lateDate : ""}>
                                        {formatDate(order.deadline)}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className={styles.empty}>
                                    {loading ? "Loading data..." : "No work orders found matching your criteria."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
  );
}
