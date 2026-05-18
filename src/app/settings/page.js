"use client";
import Link from "next/link";
import { FaTasks, FaRoute, FaUserCog, FaDatabase, FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import styles from "./settings.module.css";

const SETTINGS_CARDS = [
  {
    id: 'statuses',
    title: 'Workflow Statuses',
    description: 'Define and customize the stages of your product development pipeline with custom names and colors.',
    icon: <FaRoute />,
    link: '/settings/statuses',
    label: 'Manage Statuses'
  },
  {
    id: 'checklist',
    title: 'Checklist Templates',
    description: 'Create and manage reusable sets of tasks to streamline your product development quality control.',
    icon: <FaTasks />,
    link: '/settings/checklists',
    label: 'Manage Templates'
  },
  {
    id: 'holidays',
    title: 'Holidays Management',
    description: 'Set up national holidays and non-working days to calculate production deadlines more accurately.',
    icon: <FaCalendarAlt />,
    link: '/settings/holidays',
    label: 'Manage Holidays'
  },
  {
    id: 'roles',
    title: 'Role Management',
    description: 'Configure system-wide user permissions and promote staff to administrative or directorial roles.',
    icon: <FaUserCog />,
    link: '/user-management',
    label: 'User Access'
  },
  {
    id: 'system',
    title: 'System Maintenance',
    description: 'Perform database migrations, setup initial data, and configure custom fields for your products.',
    icon: <FaDatabase />,
    link: '/settings/maintenance',
    label: 'Maintenance'
  }

];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export default function SettingsHubPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.toLowerCase();

  // Filter cards based on role
  // Hide Workflow Statuses and System Maintenance for Direktur
  const visibleCards = SETTINGS_CARDS.filter(card => {
    if (userRole === 'direktur') {
      return card.id !== 'statuses' && card.id !== 'system';
    }
    return true;
  });

  return (
    <div className={styles.container}>
      <motion.header 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >

        <h1 className={styles.title}>System Settings</h1>
        <p className={styles.subtitle}>Configure application behavior and manage global system parameters.</p>
      </motion.header>

      <motion.div 
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {visibleCards.map((card) => (
          <motion.div key={card.id} variants={itemVariants}>
            <Link href={card.link} className={styles.card}>
              <div className={styles.iconWrapper}>
                {card.icon}
              </div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDescription}>{card.description}</p>
              <div className={styles.cardFooter}>
                <span>{card.label}</span>
                <FaArrowRight className={styles.arrowIcon} size={14} />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
