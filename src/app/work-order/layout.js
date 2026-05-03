"use client"

import Link from "next/link";
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import styles from "../dashboard/dashboard.module.css"
import { FaBoxOpen, FaFileInvoice, FaCog, FaUsersCog, FaUserShield, FaPowerOff, FaClipboardList } from "react-icons/fa"

export default function WorkOrderLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = session?.user?.role

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  return (
    <div className={styles.dashboardLayout}>
      <aside className={styles.sidebar}>
        {isAuthenticated ? (
          <div>
            <div className={styles.logoContainer}>
              <img src="/logo.jpg" alt="Logo Jalin Alam" className={styles.logo} />
              <h2 className={styles.appName}>Jalin Alam</h2>
            </div>

            <div className={styles.userInfoTop}>
              <div>
                <p className={styles.welcomeText}>
                  Halo {session?.user?.name || "User"}
                </p>
                <small className={styles.userEmail}>{session?.user?.email}</small>
              </div>
              <button onClick={() => signOut()} className={styles.logoutButton} title="Logout">
                <FaPowerOff />
              </button>
            </div>

            <div className={styles.sidebarMenu}>
              <Link href="/dashboard" className={`${styles.sidebarMenuItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
                <FaCog className={styles.menuIcon} />
                <span>Overview</span>
              </Link>
              <Link href="/inquiries" className={`${styles.sidebarMenuItem} ${pathname === '/inquiries' ? styles.active : ''}`}>
                <FaFileInvoice className={styles.menuIcon} />
                <span>Inquiry Management</span>
              </Link>
              <Link href="/product" className={`${styles.sidebarMenuItem} ${pathname === '/product' ? styles.active : ''}`}>
                <FaBoxOpen className={styles.menuIcon} />
                <span>Product Development</span>
              </Link>
              <Link href="/supplier" className={`${styles.sidebarMenuItem} ${pathname === '/supplier' ? styles.active : ''}`}>
                <FaUsersCog className={styles.menuIcon} />
                <span>Supplier</span>
              </Link>
              <Link href="/work-order" className={`${styles.sidebarMenuItem} ${pathname === '/work-order' ? styles.active : ''}`}>
                <FaClipboardList className={styles.menuIcon} />
                <span>Perintah Kerja</span>
              </Link>

              {(role === "direktur") && (
                <Link href="/user-management" className={`${styles.sidebarMenuItem} ${pathname === '/user-management' ? styles.active : ''}`}>
                  <FaUserShield className={styles.menuIcon} />
                  <span>User Management</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.logoContainer}>
            <h2 className={styles.appName}>Jalin Alam</h2>
          </div>
        )}
      </aside>

      <main className={styles.dashboardContent}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
            <p>Loading session...</p>
          </div>
        ) : isAuthenticated ? (
          children
        ) : null}
      </main>
    </div>
  )
}
