"use client"

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaTrash, FaBox, FaExclamationTriangle, FaClock, FaArrowRight, FaPlus, FaUsers, FaCog, FaChartLine, FaInfoCircle, FaCalendarCheck, FaBriefcase, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonCard, SkeletonRow, Skeleton } from "@/app/components/ui/Skeleton";

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lateProducts: 0,
    nearDeadlineCount: 0,
    ongoingProducts: 0,
    completionRate: 0,
    upcomingDeadlines: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setTimeout(() => setLoading(false), 500); // Small delay for smooth transition
      }
    }

    fetchStats();
  }, []);



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

      {/* Notifications Section Removed */}

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
          <motion.div 
            key="dashboard-content-loaded"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={styles.summaryGrid}
          >
            <motion.div 
              key="card-progress"
              className={`${styles.summaryCard} ${styles.bgProgress}`}
              variants={itemVariants}
            >
              <div className={styles.tileHeader}>
                <FaChartLine />
                <span>TOTAL PROGRESS</span>
              </div>
              <div className={styles.tileBody}>
                <span className={styles.tileValue}>{stats.completionRate}%</span>
                <div className={styles.tileProgressBar}>
                  <div className={styles.tileProgressBarFill} style={{ width: `${stats.completionRate}%` }}></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              key="card-timeline"
              className={`${styles.summaryCard} ${theme === 'danger' ? styles.bgTimelineDanger : styles.bgTimeline}`}
              variants={itemVariants}
            >
              <div className={styles.tileHeader}>
                <FaExclamationTriangle />
                <span>TIMELINE STATUS</span>
              </div>
              <div className={styles.tileBody}>
                <div className={styles.miniStatRow}>
                  <span className={styles.miniStatLabel}>Overdue</span>
                  <span className={`${styles.miniStatValue} ${styles.textDanger}`}>{stats.lateProducts}</span>
                </div>
                <div className={styles.miniStatRow}>
                  <span className={styles.miniStatLabel}>Near (H-7)</span>
                  <span className={`${styles.miniStatValue} ${styles.textWarning}`}>{stats.nearDeadlineCount}</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              key="card-workload"
              className={`${styles.summaryCard} ${styles.bgWorkload}`}
              variants={itemVariants}
            >
              <div className={styles.tileHeader}>
                <FaBox />
                <span>WORKLOAD</span>
              </div>
              <div className={styles.tileBody}>
                <span className={styles.tileValue}>{stats.totalProducts}</span>
                <span className={styles.tileSubtext}>Active Projects</span>
              </div>
            </motion.div>

            <motion.div 
              key="card-action"
              className={`${styles.summaryCard} ${styles.bgAction}`}
              variants={itemVariants}
            >
              <div className={styles.tileHeader}>
                <FaInfoCircle />
                <span>ACTION REQUIRED</span>
              </div>
              <div className={styles.tileBody}>
                <p className={styles.reportSummaryText}>
                  {stats.lateProducts > 0 
                    ? `Selesaikan segera ${stats.lateProducts} produk yang terlambat.` 
                    : stats.nearDeadlineCount > 0 
                    ? `Focus pada ${stats.nearDeadlineCount} produk dengan deadline terdekat.`
                    : "Semua berjalan lancar. Teruskan progresmu!"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Table Section */}
      {!loading && (
        <motion.div 
          className={styles.contentSection} 
          variants={itemVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.sectionHeader}>
            <h3>Upcoming Deadlines</h3>
            <Link href="/product" className={styles.viewAllLink}>View All <FaArrowRight size={12} /></Link>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dashboardTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingDeadlines.length > 0 ? (
                  stats.upcomingDeadlines.map(product => (
                    <tr key={`row-${product.id}`} onClick={() => router.push(`/product/${product.id}`)} className={styles.clickableRow}>
                      <td>
                        <div className={styles.productName}>{product.name}</div>
                        <div className={styles.productSku}>{product.inquiry_code}</div>
                      </td>
                      <td>{formatDate(product.deadline)}</td>
                      <td>
                        <div className={styles.progressContainer}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${product.overallChecklistPercentage}%` }}
                            ></div>
                          </div>
                          <div className={styles.progressLabelGroup}>
                            <span className={styles.progressText}>{product.overallChecklistPercentage}%</span>
                            <span className={styles.progressDetail}>{product.completed_tasks} / {product.total_tasks} Tasks</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles['status' + (product.status || 'Ongoing').replace(/\s+/g, '')] || styles.statusOngoing}`}>
                          {product.status || 'Ongoing'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/product/${product.id}`} className={styles.detailsBtn}>
                          Details <FaArrowRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No upcoming deadlines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}