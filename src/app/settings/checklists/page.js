"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FaArrowLeft, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaCheckCircle, FaListUl } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./checklists.module.css";

export default function ChecklistTemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', description: '', tasks: [] });
    const [newTaskName, setNewTaskName] = useState('');

    async function fetchTemplates() {
        setLoading(true);
        try {
            const res = await fetch('/api/checklist-templates');
            if (res.ok) {
                setTemplates(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTemplates();
    }, []);

    const openModal = (template = null) => {
        if (template) {
            setFormData({ ...template });
        } else {
            setFormData({ id: null, name: '', description: '', tasks: [] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', description: '', tasks: [] });
        setNewTaskName('');
    };

    const handleAddTask = () => {
        if (!newTaskName.trim()) return;
        setFormData({
            ...formData,
            tasks: [...formData.tasks, { task_name: newTaskName.trim() }]
        });
        setNewTaskName('');
    };

    const handleRemoveTask = (index) => {
        const newTasks = [...formData.tasks];
        newTasks.splice(index, 1);
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `/api/checklist-templates/${formData.id}` : '/api/checklist-templates';
        const method = formData.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                fetchTemplates();
                closeModal();
            } else {
                alert("Failed to save template");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            const res = await fetch(`/api/checklist-templates/${id}`, { method: 'DELETE' });
            if (res.ok) fetchTemplates();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className={styles.container}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Link href="/settings" className={styles.backLink || styles.secondaryBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '20px' }}>
                    <FaArrowLeft size={14} /> Back to Settings
                </Link>
            </motion.div>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Checklist Templates</h1>
                    <p className={styles.subtitle}>Standardize your quality control with reusable task sets.</p>
                </div>
                <button onClick={() => openModal()} className={styles.addButton}>
                    <FaPlus /> New Template
                </button>
            </header>

            {loading ? (
                <div className={styles.emptyState}>Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className={styles.emptyState}>
                    <FaListUl size={40} style={{ marginBottom: '20px', opacity: 0.2 }} />
                    <p>No templates found. Create your first template to get started!</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {templates.map((template) => (
                        <motion.div 
                            key={template.id} 
                            className={styles.templateCard}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.templateName}>{template.name}</h3>
                                <span className={styles.taskCount}>{template.tasks.length} Tasks</span>
                            </div>
                            <p className={styles.description}>{template.description || "No description provided."}</p>
                            
                            <div className={styles.taskListPreview}>
                                {template.tasks.slice(0, 3).map((task, idx) => (
                                    <div key={idx} className={styles.taskItem}>
                                        <div className={styles.dot} /> {task.task_name}
                                    </div>
                                ))}
                                {template.tasks.length > 3 && (
                                    <div className={styles.taskItem} style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                        + {template.tasks.length - 3} more tasks
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardActions}>
                                <button onClick={() => openModal(template)} className={`${styles.actionBtn} ${styles.editBtn}`} title="Edit Template">
                                    <FaEdit />
                                </button>
                                <button onClick={() => handleDelete(template.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete Template">
                                    <FaTrash />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Template Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <h2 className={styles.modalTitle}>{formData.id ? "Edit Template" : "Create New Template"}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Template Name</label>
                                    <input 
                                        className={styles.input} 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g., Kaos Polos Standard"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Description</label>
                                    <textarea 
                                        className={styles.textarea} 
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="Optional description of when to use this template..."
                                        rows={3}
                                    />
                                </div>

                                <div className={styles.tasksSection}>
                                    <label className={styles.label}>Tasks in Checklist ({formData.tasks.length})</label>
                                    <div className={styles.taskInputRow}>
                                        <input 
                                            className={styles.input} 
                                            value={newTaskName}
                                            onChange={e => setNewTaskName(e.target.value)}
                                            placeholder="Enter task name..."
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                                        />
                                        <button type="button" onClick={handleAddTask} className={styles.addButton}>
                                            <FaPlus />
                                        </button>
                                    </div>

                                    <div className={styles.taskListPreview}>
                                        {formData.tasks.map((task, index) => (
                                            <div key={index} className={styles.taskItem} style={{ justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ color: '#cbd5e0' }}>{index + 1}.</span>
                                                    <span>{task.task_name}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveTask(index)} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer' }}>
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.modalActions} style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                                    <button type="button" onClick={closeModal} className={styles.secondaryBtn}>Cancel</button>
                                    <button type="submit" className={styles.primaryBtn}>
                                        <FaCheckCircle style={{ marginRight: '8px' }} /> {formData.id ? "Save Changes" : "Create Template"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
