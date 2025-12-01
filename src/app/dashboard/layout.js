"use client"

import Link from "next/link"; // Add Link import
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaBoxOpen, FaFileInvoice, FaCog, FaUsersCog, FaUserShield, FaPowerOff } from "react-icons/fa"

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
            <Link href="/inquiries" className={`${styles.sidebarMenuItem} ${pathname === '/inquiries' ? styles.active : ''}`}>
              <FaFileInvoice className={styles.menuIcon} />
              <span>Inquiry Management</span>
            </Link>
            <Link href="/product" className={`${styles.sidebarMenuItem} ${pathname === '/product' ? styles.active : ''}`}>
              <FaBoxOpen className={styles.menuIcon} />
              <span>Product Development</span>
            </Link>
            <Link href="/supplier" className={`${styles.sidebarMenuItem} ${pathname === '/supplier' ? styles.active : ''}`}>
              <FaBoxOpen className={styles.menuIcon} /> {/* Using FaBoxOpen for materials */}
              <span>Supplier</span>
            </Link>

            {(role === "admin" || role === "direktur") && (
              <Link href="/user-management" className={`${styles.sidebarMenuItem} ${pathname === '/user-management' ? styles.active : ''}`}>
                <FaUsersCog className={styles.menuIcon} />
                <span>Production Management</span>
              </Link>
            )}

            {(role === "direktur") && (
              <Link href="/user-management" className={`${styles.sidebarMenuItem} ${pathname === '/user-management' ? styles.active : ''}`}>
                <FaUserShield className={styles.menuIcon} />
                <span>User Management</span>
              </Link>
            )}
            {/* <Link href="/settings" className={`${styles.sidebarMenuItem} ${pathname === '/settings' ? styles.active : ''}`}>
              <FaCog className={styles.menuIcon} />
              <span>Setting & Report</span>
            </Link> */}
          </div>
        </div>

        <div className={styles.userInfoBottom}>
        </div>
      </aside>

      <main className={`${styles.dashboardContent} ${centerContent ? styles.dashboardContentCentered : ''}`}>
        {children}
      </main>
    </div>
  )
}
