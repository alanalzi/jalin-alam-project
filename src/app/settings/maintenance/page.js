"use client";
import { useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaDatabase, FaUserShield, FaExclamationTriangle, FaCheckCircle, FaTools, FaTasks } from "react-icons/fa";
import { motion } from "framer-motion";
import styles from "../settings.module.css";
import maintenanceStyles from "./maintenance.module.css";

const MAINTENANCE_TASKS = [
  {
    id: 'db-users',
    title: 'Initialize Users Table',
    description: 'Create the primary Users table if it does not already exist.',
    endpoint: '/api/setup-db',
    icon: <FaDatabase />
  },
  {
    id: 'roles',
    title: 'Migrate User Roles',
    description: 'Promote users to RnD or Direktur roles based on predefined rules.',
    endpoint: '/api/setup-roles',
    icon: <FaUserShield />
  },
  {
    id: 'checklists',
    title: 'Setup Checklist Templates',
    description: 'Create tables for managing reusable product development checklist templates.',
    endpoint: '/api/setup-checklists',
    icon: <FaTasks />
  },
  {
    id: 'custom-fields',
    title: 'Setup Custom Fields',
    description: 'Add the JSON custom_attributes column to the Products table.',
    endpoint: '/api/setup-custom-fields',
    icon: <FaTools />
  },

  {
      id: 'whitelist',
      title: 'Initialize Whitelist',
      description: 'Create the Whitelist table for secure external email access.',
      endpoint: '/api/setup-whitelist',
      icon: <FaUserShield />
  },
  {
      id: 'edit-requests',
      title: 'Setup Edit Validation',
      description: 'Create table for managing edit requests that require Direktur approval.',
      endpoint: '/api/setup-edit-requests',
      icon: <FaCheckCircle />
  }
];

export default function MaintenancePage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const runTask = async (taskId, endpoint) => {
    setLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setResults(prev => ({ ...prev, [taskId]: data.message || data.error }));
    } catch (err) {
      setResults(prev => ({ ...prev, [taskId]: "Network error occurred." }));
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
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
        <h1 className={styles.title}>System Maintenance</h1>
        <p className={styles.subtitle}>Perform critical system-level tasks and setup procedures.</p>
      </header>

      <div className={maintenanceStyles.warningBox}>
        <FaExclamationTriangle size={20} />
        <div>
          <strong>Warning:</strong> Use these tools only when setting up a new environment or resolving database schema issues. Some tasks may perform migrations on existing data.
        </div>
      </div>

      <div className={maintenanceStyles.taskList}>
        {MAINTENANCE_TASKS.map((task) => (
          <motion.div 
            key={task.id} 
            className={maintenanceStyles.taskCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={maintenanceStyles.taskInfo}>
              <div className={maintenanceStyles.taskIcon}>{task.icon}</div>
              <div>
                <h3 className={maintenanceStyles.taskTitle}>{task.title}</h3>
                <p className={maintenanceStyles.taskDesc}>{task.description}</p>
              </div>
            </div>
            
            <div className={maintenanceStyles.taskActions}>
              {results[task.id] && (
                <div className={maintenanceStyles.result}>
                  <FaCheckCircle color="#38a169" /> {results[task.id]}
                </div>
              )}
              <button 
                onClick={() => runTask(task.id, task.endpoint)}
                disabled={loading[task.id]}
                className={maintenanceStyles.runBtn}
              >
                {loading[task.id] ? "Running..." : "Run Task"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
