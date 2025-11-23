"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaBoxOpen, FaFileInvoice, FaCog, FaUsersCog, FaUserShield } from "react-icons/fa"

export default function DashboardLayout({ children, centerContent = false }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = session?.user?.role

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return <p className="text-center mt-10">Loading...</p>
  }

  return (
    <div className={styles.dashboardLayout}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logoContainer}>
            <img src="/logo.jpg" alt="Logo Jalin Alam" className={styles.logo} />
            <h2 className={styles.appName}>Jalin Alam</h2>
          </div>

          <div className={styles.userInfoTop}>
            <p className={styles.welcomeText}>
              Halo {session?.user?.name || "User"}
            </p>
            <small className={styles.userEmail}>{session?.user?.email}</small>
          </div>

          <div className={styles.sidebarMenu}>
            <a href="/product" className={`${styles.sidebarMenuItem} ${pathname === '/product' ? styles.active : ''}`}>
              <FaBoxOpen className={styles.menuIcon} />
              <span>Product Development</span>
            </a>
            <a href="/inquiry" className={`${styles.sidebarMenuItem} ${pathname === '/inquiry' ? styles.active : ''}`}>
              <FaFileInvoice className={styles.menuIcon} />
              <span>Inquiry Management</span>
            </a>
            <a href="/settings" className={`${styles.sidebarMenuItem} ${pathname === '/settings' ? styles.active : ''}`}>
              <FaCog className={styles.menuIcon} />
              <span>Setting & Report</span>
            </a>

            {(role === "admin" || role === "direktur") && (
              <a href="/user-management" className={`${styles.sidebarMenuItem} ${pathname === '/user-management' ? styles.active : ''}`}>
                <FaUsersCog className={styles.menuIcon} />
                <span>Production Management</span>
              </a>
            )}

            {(role === "direktur") && (
              <a href="/user-management" className={`${styles.sidebarMenuItem} ${pathname === '/user-management' ? styles.active : ''}`}>
                <FaUserShield className={styles.menuIcon} />
                <span>User Management</span>
              </a>
            )}
          </div>
        </div>

        <div className={styles.userInfoBottom}>
          <button onClick={() => signOut()} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </aside>

      <main className={`${styles.dashboardContent} ${centerContent ? styles.dashboardContentCentered : ''}`}>
        {children}
      </main>
    </div>
  )
}
