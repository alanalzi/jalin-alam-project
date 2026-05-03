"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FaTrash, FaSearch, FaUserTag, FaExclamationCircle, FaUserPlus, FaEnvelopeOpenText } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { SkeletonRow, Skeleton } from "@/app/components/ui/Skeleton"
import styles from "./user-management.module.css"

export default function UserManagementPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState([])
    const [whitelist, setWhitelist] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [isInviting, setIsInviting] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login")
        } else if (status === "authenticated") {
            if (session?.user?.role !== "direktur") {
                router.push("/dashboard")
            } else {
                fetchData()
            }
        }
    }, [status, session, router])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Concurrent fetching, but handle each individually so one failure doesn't block the other
            const fetchUsers = fetch('/api/users').then(r => r.ok ? r.json() : []);
            const fetchWhitelist = fetch('/api/users/whitelist').then(r => r.ok ? r.json() : []);

            const [userData, whitelistData] = await Promise.all([fetchUsers, fetchWhitelist]);

            setUsers(userData);
            setWhitelist(whitelistData);
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setTimeout(() => setLoading(false), 600)
        }
    }

    const handleInvite = async (e) => {
        e.preventDefault()
        setIsInviting(true)
        try {
            const res = await fetch('/api/users/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail }),
            })

            const data = await res.json()
            if (res.ok) {
                alert("User invited successfully!")
                setInviteEmail("")
                setShowInviteModal(false)
                fetchData() // Refresh list
            } else {
                alert(data.message || "Failed to invite user")
            }
        } catch (error) {
            alert("An error occurred while inviting")
        } finally {
            setIsInviting(false)
        }
    }

    const handleRemoveFromWhitelist = async (id, email) => {
        if (!confirm(`Cancel invitation for ${email}?`)) return
        try {
            const res = await fetch(`/api/users/whitelist?id=${id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setWhitelist(prev => prev.filter(item => item.id !== id))
            }
        } catch (error) {
            console.error("Error removing from whitelist:", error)
        }
    }

    const handleRoleChange = async (id, newRole) => {
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })

            if (res.ok) {
                setUsers(prev =>
                    prev.map(user => (user.id === id ? { ...user, role: newRole } : user))
                )
                alert("Role updated successfully!")
            } else {
                const errorData = await res.json()
                alert(`Error: ${errorData.message}`)
            }
        } catch (error) {
            console.error("Error updating role:", error)
        }
    }

    const handleDeleteUser = async (id, name) => {
        if (!confirm(`Are you sure you want to delete user ${name}?`)) return

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                setUsers(prev => prev.filter(user => user.id !== id))
                alert(`User ${name} deleted successfully.`)
            } else {
                const errorData = await res.json()
                alert(`Error: ${errorData.message || res.statusText}`)
            }
        } catch (error) {
            console.error("Error deleting user:", error)
        }
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.05 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    }

    return (
        <motion.div
            className={styles.container}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <header className={styles.header}>
                <motion.h1 className={styles.title} variants={itemVariants}>
                    <FaUserTag className={styles.titleIcon} /> User Management
                </motion.h1>
            </header>

            {/* Toolbar: Search & Invite */}
            <motion.div className={styles.toolbar} variants={itemVariants}>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    <FaSearch className={styles.searchIcon} />
                </div>
                <button
                    className={styles.inviteButton}
                    onClick={() => setShowInviteModal(true)}
                >
                    <FaUserPlus /> Invite User
                </button>
            </motion.div>

            {/* Active Users Section */}
            <motion.div className={styles.tableWrapper} variants={itemVariants}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Active Users</th>
                            <th>Email Address</th>
                            <th>Current Role</th>
                            <th>Joined Date</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                <SkeletonRow />
                                <SkeletonRow />
                            </>
                        ) : filteredUsers.length > 0 ? (
                            <AnimatePresence mode="popLayout">
                                {filteredUsers.map((user, index) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <td>
                                            <div className={styles.userName}>
                                                <div className={styles.userAvatar}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span>{user.name}</span>
                                            </div>
                                        </td>
                                        <td className={styles.userEmail}>{user.email}</td>
                                        <td>
                                            <div className={styles.roleSelectWrapper}>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className={styles.roleSelect}
                                                    disabled={session?.user?.email === user.email}
                                                >
                                                    <option value="direktur">Direktur</option>
                                                    <option value="RnD">RnD</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <div className={styles.selectArrow}>
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 1L5 5L9 1" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.dateText}>
                                                {new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    className={styles.deleteButton}
                                                    disabled={session?.user?.email === user.email}
                                                    title="Delete User"
                                                >
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        ) : (
                            <tr>
                                <td colSpan="5">
                                    <div className={styles.emptyState}>
                                        <FaExclamationCircle className={styles.emptyIcon} />
                                        <p>No active users found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </motion.div>

            {/* Whitelist / Pending Section */}
            {whitelist.length > 0 && (
                <motion.div variants={itemVariants}>
                    <div className={styles.whitelistHeader}>
                        <h2 className={styles.sectionTitle}>Pending Invitations</h2>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Invited Email</th>
                                    <th>Invited By</th>
                                    <th>Invitation Date</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {whitelist.map((item) => (
                                    <tr key={item.id}>
                                        <td className={styles.userName}>
                                            <div className={`${styles.userAvatar} ${styles.pendingAvatar}`}>
                                                <FaEnvelopeOpenText size={14} />
                                            </div>
                                            {item.email}
                                        </td>
                                        <td className={styles.userEmail}>{item.invited_by}</td>
                                        <td>
                                            <span className={styles.dateText}>
                                                {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    onClick={() => handleRemoveFromWhitelist(item.id, item.email)}
                                                    className={styles.deleteButton}
                                                    title="Cancel Invitation"
                                                >
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h2 className={styles.modalTitle}>Invite New User</h2>
                            <p className={styles.modalSubtitle}>Enter the Google email address of the person you want to authorize.</p>

                            <form onSubmit={handleInvite}>
                                <div className={styles.formGroup}>
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className={styles.modalInput}
                                        placeholder="example@gmail.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        onClick={() => setShowInviteModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.submitButton}
                                        disabled={isInviting}
                                    >
                                        {isInviting ? "Sending..." : "Send Invitation"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
