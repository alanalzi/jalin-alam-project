"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaArrowLeft, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaPalette, FaCheckCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./statuses.module.css";

export default function StatusesPage() {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', color: '' });
    const [newStatus, setNewStatus] = useState({ name: '', color: '#3182ce' });

    async function fetchStatuses() {
        setLoading(true);
        try {
            const res = await fetch('/api/statuses');
            if (res.ok) {
                setStatuses(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch statuses", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStatus)
            });
            if (res.ok) {
                setNewStatus({ name: '', color: '#3182ce' });
                fetchStatuses();
            } else {
                toast.error("Failed to create status");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdate = async (id) => {
        try {
            const res = await fetch(`/api/statuses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setEditingId(null);
                fetchStatuses();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure? This might affect products using this status.")) return;
        try {
            await fetch(`/api/statuses/${id}`, { method: 'DELETE' });
            fetchStatuses();
        } catch (error) {
            console.error(error);
        }
    };

    const startEdit = (status) => {
        setEditingId(status.id);
        setEditForm({ name: status.name, color: status.color });
    };

    return (
        <div className={styles.container}>
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <Link href="/settings" className={styles.backLink}>
                    <FaArrowLeft size={14} /> Back to Settings
                </Link>
            </motion.div>

            <header className={styles.header}>
                <h1 className={styles.title}>Workflow Statuses</h1>
                <p className={styles.subtitle}>Define the stages of your product development pipeline.</p>
            </header>

            {/* Add New Status Card */}
            <motion.div 
                className={styles.addFormCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className={styles.cardTitle}>
                    <FaPlus style={{ marginRight: '10px', color: '#3182ce' }} /> Add New Status
                </h3>
                <form onSubmit={handleCreate} className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.inputName}`}>
                        <label className={styles.label}>Status Name</label>
                        <input
                            type="text"
                            value={newStatus.name}
                            onChange={e => setNewStatus({ ...newStatus, name: e.target.value })}
                            placeholder="e.g. Sampling, Production, QA..."
                            required
                            className={styles.input}
                        />
                    </div>
                    <div className={`${styles.formGroup} ${styles.inputColor}`}>
                        <label className={styles.label}>Color</label>
                        <input
                            type="color"
                            value={newStatus.color}
                            onChange={e => setNewStatus({ ...newStatus, color: e.target.value })}
                            className={styles.colorPicker}
                        />
                    </div>
                    <button type="submit" className={styles.addButton}>
                        <FaCheckCircle /> Save Status
                    </button>
                </form>
            </motion.div>

            {/* Statuses List */}
            <motion.div 
                className={styles.tableWrapper}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading statuses...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Status Name</th>
                                <th style={{ width: '15%' }}>Color</th>
                                <th style={{ width: '25%' }}>Visual Preview</th>
                                <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {statuses.map(status => (
                                    <motion.tr 
                                        key={status.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        layout
                                    >
                                        {editingId === status.id ? (
                                            <>
                                                <td>
                                                    <input
                                                        value={editForm.name}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                        className={styles.input}
                                                        style={{ width: '100%' }}
                                                        autoFocus
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="color"
                                                        value={editForm.color}
                                                        onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                                        className={styles.colorPicker}
                                                        style={{ height: '38px', width: '60px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: editForm.color }}>
                                                        {editForm.name || 'Preview'}
                                                    </span>
                                                </td>
                                                <td className={styles.actions}>
                                                    <button onClick={() => handleUpdate(status.id)} className={`${styles.actionBtn} ${styles.saveBtn}`} title="Save Changes">
                                                        <FaSave />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className={`${styles.actionBtn} ${styles.cancelBtn}`} title="Cancel">
                                                        <FaTimes />
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ fontWeight: '600', color: '#1a202c' }}>{status.name}</td>
                                                <td>
                                                    <div className={styles.colorDot} style={{ backgroundColor: status.color }}></div>
                                                </td>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: status.color }}>
                                                        {status.name}
                                                    </span>
                                                </td>
                                                <td className={styles.actions}>
                                                    <button onClick={() => startEdit(status)} className={`${styles.actionBtn} ${styles.editBtn}`} title="Edit Status">
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => handleDelete(status.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete Status">
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                )}
            </motion.div>
        </div>
    );
}
