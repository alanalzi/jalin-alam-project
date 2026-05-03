"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBell, FaCheck, FaInfoCircle } from 'react-icons/fa';
import styles from './notifications.module.css';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAllNotifications() {
            try {
                const res = await fetch('/api/notifications?filter=all', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Failed to load notifications", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAllNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, { method: 'PUT' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => 
                    n.id === id ? { ...n, is_read: 1 } : n
                ));
            }
        } catch (e) {
            console.error("Failed to mark as read");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className={styles.pageContainer}><p>Loading...</p></div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Riwayat Notifikasi</h1>
                <div className={styles.unreadCount}>
                    {notifications.filter(n => !n.is_read).length} Unread
                </div>
            </div>

            <div className={styles.notificationList}>
                {notifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FaBell size={48} style={{ color: '#cbd5e0', marginBottom: '20px' }} />
                        <p>Belum ada riwayat notifikasi.</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}>
                            <div className={styles.iconWrapper}>
                                <FaInfoCircle />
                            </div>
                            <div className={styles.contentWrapper}>
                                <div className={styles.message}>{notif.message}</div>
                                <div className={styles.date}>{formatDate(notif.created_at)}</div>
                            </div>
                            <div className={styles.actions}>
                                {notif.link && (
                                    <Link href={notif.link} className={styles.linkBtn}>Lihat</Link>
                                )}
                                {!notif.is_read && (
                                    <button onClick={() => markAsRead(notif.id)} className={styles.markReadBtn} title="Tandai sudah dibaca">
                                        <FaCheck />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
