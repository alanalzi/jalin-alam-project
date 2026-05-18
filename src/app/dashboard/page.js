"use client"

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaTrash, FaBox, FaExclamationTriangle, FaClock, FaArrowRight, FaPlus, FaUsers, FaCog, FaChartLine, FaInfoCircle, FaCalendarCheck, FaBriefcase, FaShieldAlt, FaCheck, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonCard, SkeletonRow, Skeleton } from "@/app/components/ui/Skeleton";
import { calculateWorkingDays, fetchHolidaysFromAPI } from "@/app/lib/dateUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import InquiryDetailModal from "@/app/components/ui/InquiryDetailModal";



// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Helper function to get deadline status color
function getDeadlineStatus(deadlineString, isCompleted) {
  if (!deadlineString) return { color: '#718096', bg: 'transparent', label: '' };
  if (isCompleted) return { color: '#718096', bg: '#f8fafc', label: 'Done' };
  
  const deadline = new Date(deadlineString);
  const today = new Date();
  today.setHours(0,0,0,0);
  deadline.setHours(0,0,0,0);
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { color: '#c53030', bg: '#fff5f5', label: 'Overdue' };
  if (diffDays === 0) return { color: '#c53030', bg: '#fff5f5', label: 'Hari ini' };
  if (diffDays <= 3) return { color: '#c53030', bg: '#fff5f5', label: `${diffDays} hari lagi` };
  if (diffDays <= 7) return { color: '#dd6b20', bg: '#fffaf0', label: `${diffDays} hari lagi` };
  return { color: '#38a169', bg: '#f0fff4', label: `${diffDays} hari lagi` };
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalCapacity: 0,
    totalActive: 0,
    lateProducts: 0,
    nearDeadlineCount: 0,
    ongoingProducts: 0,
    completionRate: 0,
    upcomingDeadlines: [],
    recentlyCompleted: [],
    statusDistribution: { ongoing: 0, late: 0, completed: 0, cancelled: 0, pending: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [tableTab, setTableTab] = useState('upcoming'); // 'upcoming' or 'completed'
  const [dashboardSort, setDashboardSort] = useState('deadline-asc');
  const [holidays, setHolidays] = useState([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [drilldownStatus, setDrilldownStatus] = useState(null);
  const [drilldownData, setDrilldownData] = useState([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [viewingInquiryId, setViewingInquiryId] = useState(null);



  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, holidaysRes] = await Promise.all([
          fetch('/api/dashboard/stats', { cache: 'no-store' }),
          fetch('/api/holidays')
        ]);
        
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (holidaysRes.ok) {
          const holidayData = await holidaysRes.json();
          setHolidays(holidayData);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setTimeout(() => {
          setLoading(false);
          // Set chart ready after a small delay to ensure DOM is settled
          setTimeout(() => setIsChartReady(true), 200);
        }, 500);
      }
    }

    fetchStats();
  }, []);



  const handleDrilldown = async (status) => {
    setDrilldownStatus(status);
    setIsDrilldownLoading(true);
    try {
      const res = await fetch(`/api/dashboard/drilldown?status=${status.toLowerCase()}`);
      if (res.ok) {
        setDrilldownData(await res.json());
      }
    } catch (error) {
      console.error("Drilldown failed", error);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  const getReportTheme = () => {
    if (stats.lateProducts > 0) return 'danger';
    if (stats.nearDeadlineCount > 0) return 'warning';
    return 'success';
  };

  const theme = getReportTheme();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div
      className={styles.dashboardContainer}
      translate="no"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <motion.h1 className={styles.title} variants={itemVariants}>Dashboard</motion.h1>
          <motion.p className={styles.subtitle} variants={itemVariants}>Welcome back! Here&apos;s what&apos;s happening today.</motion.p>
        </div>
        
        <motion.div className={styles.headerActions} variants={itemVariants}>
          <Link href="/product?action=new" className={styles.headerActionLink}>
            <FaPlus size={18} />
            <span>New Product</span>
          </Link>
          {session?.user?.role === 'direktur' && (
            <Link href="/validations" className={styles.headerActionLink}>
              <FaShieldAlt size={18} />
              <span>Validation</span>
            </Link>
          )}
          {session?.user?.role === 'direktur' && (
            <Link href="/user-management" className={styles.headerActionLink}>
              <FaUsers size={18} />
              <span>User Management</span>
            </Link>
          )}
          {(session?.user?.role === 'direktur' || session?.user?.role === 'admin') && (
            <Link href="/work-order" className={styles.headerActionLink}>
              <FaBriefcase size={18} />
              <span>Progress Order</span>
            </Link>
          )}
          {session?.user?.role === 'direktur' && (
            <Link href="/settings" className={styles.headerActionLink}>
              <FaCog size={18} />
              <span>Settings</span>
            </Link>
          )}
        </motion.div>
      </header>

      {/* Drilldown Modal */}
      <AnimatePresence>
        {drilldownStatus && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setDrilldownStatus(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={styles.modalContent}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>Products: {drilldownStatus}</h3>
                <button onClick={() => setDrilldownStatus(null)} className={styles.closeBtn}><FaTimes /></button>
              </div>
              <div className={styles.modalList} style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {isDrilldownLoading ? (
                  <div className={styles.loader}>Loading items...</div>
                ) : drilldownData.length === 0 ? (
                  <div className={styles.emptyDrilldown}>No products in this category.</div>
                ) : (
                  <table className={styles.drilldownTable}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Product Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownData.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: '600' }}>{item.name}</td>
                          <td><span className={styles.categoryBadge}>{item.category || item.source}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                                {item.status === 'completed' || item.completed_at ? 
                                  `Done on ${formatDate(item.completed_at)}` : 
                                  (item.deadline ? `Deadline: ${formatDate(item.deadline)}` : 
                                  (item.created_at ? `Requested on ${formatDate(item.created_at)}` : 'No deadline'))}
                              </span>
                              {item.source === 'Inquiry' ? (
                                <button 
                                  className={styles.viewBtn}
                                  onClick={() => setViewingInquiryId(item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  View <FaArrowRight size={10} />
                                </button>
                              ) : (
                                <Link 
                                  href={`/product/${item.id}`} 
                                  className={styles.viewBtn}
                                  onClick={() => setDrilldownStatus(null)}
                                >
                                  View <FaArrowRight size={10} />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards Section */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="dashboard-loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.summaryGrid}
          >
            <Skeleton height="120px" borderRadius="14px" />
            <Skeleton height="120px" borderRadius="14px" />
            <Skeleton height="120px" borderRadius="14px" />
            <Skeleton height="120px" borderRadius="14px" />
          </motion.div>
        ) : (

        <motion.div className={styles.statsGrid} variants={containerVariants} initial="hidden" animate="visible">
          <motion.div 
            className={`${styles.statCard} ${styles.clickableCard}`} 
            variants={itemVariants}
            onClick={() => handleDrilldown('active')}
          >
            <div className={`${styles.statIcon} ${styles.ongoingIcon}`}><FaBox /></div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Active Workload</span>
              <span className={styles.statValue}>{stats.totalActive}</span>
              <span className={styles.statTrend}>Production Units</span>
            </div>
          </motion.div>

          <motion.div 
            className={`${styles.statCard} ${styles.clickableCard}`} 
            variants={itemVariants}
            onClick={() => handleDrilldown('late')}
          >
            <div className={`${styles.statIcon} ${styles.lateIcon}`}><FaExclamationTriangle /></div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Late Projects</span>
              <span className={styles.statValue}>{stats.lateProducts}</span>
              <span className={styles.statTrend} style={{ color: '#e53e3e' }}>Requires Attention</span>
            </div>
          </motion.div>

          <motion.div 
            className={`${styles.statCard} ${styles.clickableCard}`} 
            variants={itemVariants}
            onClick={() => handleDrilldown('near_deadline')}
          >
            <div className={`${styles.statIcon} ${styles.nearIcon}`}><FaClock /></div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Near Deadline</span>
              <span className={styles.statValue}>{stats.nearDeadlineCount}</span>
              <span className={styles.statTrend} style={{ color: '#dd6b20' }}>Next 7 Days</span>
            </div>
          </motion.div>

          <motion.div 
            className={`${styles.statCard} ${styles.clickableCard}`} 
            variants={itemVariants}
            onClick={() => handleDrilldown('pending')}
          >
            <div className={`${styles.statIcon} ${styles.pendingIcon}`}><FaShieldAlt /></div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Pending Validation</span>
              <span className={styles.statValue}>{stats.statusDistribution.pending}</span>
              <span className={styles.statTrend} style={{ color: '#dd6b20' }}>Action Required</span>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <InquiryDetailModal 
        isOpen={!!viewingInquiryId}
        inquiryId={viewingInquiryId}
        onClose={() => setViewingInquiryId(null)}
      />



      {/* Main Content: Table Section */}
      {!loading && (
        <div className={styles.mainDashboardGrid}>
          <motion.section 
            className={styles.contentSection}
            variants={itemVariants}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => setTableTab('upcoming')} 
                  className={`${styles.tabBtn} ${tableTab === 'upcoming' ? styles.activeTab : ''}`}
                >
                  Upcoming Deadlines
                </button>
                <button 
                  onClick={() => setTableTab('completed')} 
                  className={`${styles.tabBtn} ${tableTab === 'completed' ? styles.activeTab : ''}`}
                >
                  Recently Completed (1 Month)
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>Sort by:</span>
                <select 
                  className={styles.sortSelect}
                  value={dashboardSort}
                  onChange={(e) => setDashboardSort(e.target.value)}
                >
                  <option value="deadline-asc">Deadline (Soonest)</option>
                  <option value="deadline-desc">Deadline (Latest)</option>
                  <option value="created_at-desc">Newest Added</option>
                  <option value="created_at-asc">Oldest Added</option>
                </select>
              </div>
            </div>

            <div className={styles.tableContainer} style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className={styles.dashboardTable}>
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Deadline Status</th>
                    <th>Progress</th>
                    <th>PIC Team</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const activeList = tableTab === 'upcoming' ? stats.upcomingDeadlines : stats.recentlyCompleted;
                    
                    const displayList = [...activeList].sort((a, b) => {
                      const [field, order] = dashboardSort.split('-');
                      let valA, valB;
                      
                      if (field === 'deadline') {
                        valA = a.deadline ? new Date(a.deadline).getTime() : (order === 'asc' ? Infinity : -Infinity);
                        valB = b.deadline ? new Date(b.deadline).getTime() : (order === 'asc' ? Infinity : -Infinity);
                      } else if (field === 'created_at') {
                        valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                        valB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      }
                      
                      if (valA < valB) return order === 'asc' ? -1 : 1;
                      if (valA > valB) return order === 'asc' ? 1 : -1;
                      return 0;
                    });

                    return displayList.length > 0 ? (
                      displayList.map(product => (
                        <tr key={`row-${product.id}`} onClick={() => router.push(`/product/${product.id}`)} className={styles.clickableRow}>
                          <td>
                            <div className={styles.productName}>{product.name}</div>
                            <div className={styles.productSku}>{product.inquiry_code}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.9rem' }}>
                                {formatDate(product.deadline)}
                              </span>
                              {(() => {
                                const dStatus = getDeadlineStatus(product.deadline, tableTab === 'completed');
                                const workingDays = tableTab === 'upcoming' && product.deadline ? calculateWorkingDays(new Date(), product.deadline, holidays) : null;
                                
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      color: dStatus.color, 
                                      backgroundColor: dStatus.bg, 
                                      padding: '2px 8px', 
                                      borderRadius: '10px', 
                                      width: 'fit-content',
                                      fontWeight: '600'
                                    }}>
                                      {dStatus.label}
                                    </span>
                                    {workingDays !== null && (
                                      <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '500' }}>
                                        ({workingDays} Hari Kerja)
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td>
                            <div className={styles.progressContainer}>
                              <div className={styles.progressBar}>
                                <div 
                                  className={styles.progressFill} 
                                  style={{ 
                                    width: `${product.overallChecklistPercentage || 0}%`,
                                    backgroundColor: (product.overallChecklistPercentage >= 100) ? '#38a169' : '#3182ce'
                                  }}
                                ></div>
                              </div>
                              <div className={styles.progressLabelGroup}>
                                <span className={styles.progressText}>{product.overallChecklistPercentage || 0}%</span>
                                <span className={styles.progressDetail}>{product.completed_tasks || 0}/{product.total_tasks || 0} Tasks</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FaUsers size={14} color="#3182ce" />
                                <span style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '600' }}>
                                  {product.assignees && product.assignees.length > 0 ? product.assignees[0].name : 'Unassigned'}
                                </span>
                              </div>
                              {product.assignees && product.assignees.length > 1 && (
                                <span style={{ fontSize: '0.75rem', color: '#718096', paddingLeft: '20px' }}>
                                  + {product.assignees.length - 1} others
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button className={styles.detailsBtn}>
                              View <FaArrowRight size={10} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No {tableTab === 'upcoming' ? 'upcoming' : 'recently completed (last month)'} products found.</td></tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </motion.section>

          <section className={styles.chartSection}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Status Product</h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px', display: 'block', position: 'relative' }}>
                {isChartReady && (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: stats.statusDistribution.completed, color: '#38a169' },
                        { name: 'Ongoing', value: stats.statusDistribution.ongoing, color: '#3182ce' },
                        { name: 'Late', value: stats.statusDistribution.late, color: '#e53e3e' },
                        { name: 'Inquiry', value: stats.statusDistribution.inquiry, color: '#805ad5' },
                        { name: 'Pending', value: stats.statusDistribution.pending, color: '#dd6b20' },
                        { name: 'Cancelled', value: stats.statusDistribution.cancelled, color: '#718096' },
                      ].filter(i => i.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Completed', value: stats.statusDistribution.completed, color: '#38a169' },
                        { name: 'Ongoing', value: stats.statusDistribution.ongoing, color: '#3182ce' },
                        { name: 'Late', value: stats.statusDistribution.late, color: '#e53e3e' },
                        { name: 'Inquiry', value: stats.statusDistribution.inquiry, color: '#805ad5' },
                        { name: 'Pending', value: stats.statusDistribution.pending, color: '#dd6b20' },
                        { name: 'Cancelled', value: stats.statusDistribution.cancelled, color: '#718096' },
                      ].filter(i => i.value > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          onClick={() => handleDrilldown(entry.name)}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: '600' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
              <div style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#718096' }}>Total Capacity</span>
                  <span style={{ fontWeight: '700' }}>{stats.totalCapacity} Units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', position: 'relative' }}>
                  <span style={{ color: '#718096', borderBottom: '1px dotted #cbd5e0', cursor: 'help' }} title="Persentase produk yang berjalan tepat waktu atau sudah selesai dibandingkan total kapasitas produksi.">
                    Healthy Rate <FaInfoCircle size={10} style={{ marginLeft: '4px' }} />
                  </span>
                  <span style={{ fontWeight: '700', color: '#38a169' }}>
                    {stats.totalCapacity > 0 ? Math.min(100, Math.round(((stats.statusDistribution.completed + stats.statusDistribution.ongoing) / stats.totalCapacity) * 100)) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.chartSection} style={{ marginTop: '20px' }}>
            <div className={styles.chartCard} style={{ alignItems: 'flex-start' }}>
              <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCalendarCheck size={18} color="#e11d48" /> Upcoming Holidays
              </h3>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {holidays.filter(h => new Date(h.date).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0)).length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#718096', textAlign: 'center', padding: '10px' }}>No upcoming holidays registered.</p>
                  ) : (
                    holidays
                      .filter(h => new Date(h.date).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0))
                      .map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff1f2', borderRadius: '10px', borderLeft: '4px solid #e11d48' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2d3748' }}>{h.description}</span>
                            <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                              {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#e11d48', fontWeight: 'bold', background: '#ffe4e6', padding: '4px 8px', borderRadius: '6px' }}>Public</span>
                        </div>
                    ))
                  )}
                </div>
                <Link href="/settings/holidays" style={{ 
                  fontSize: '0.75rem', 
                  color: '#e11d48', 
                  textAlign: 'center', 
                  marginTop: '4px', 
                  fontWeight: '700', 
                  textDecoration: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #ffe4e6',
                  transition: 'all 0.2s'
                }} className={styles.detailsBtn}>
                  Manage All Holidays &rarr;
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </motion.div>
  )
}