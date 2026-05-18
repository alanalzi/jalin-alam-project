"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { FaPlus, FaTrash, FaCalendarAlt } from "react-icons/fa";
import styles from "../settings.module.css";

export default function HolidaysSettingsPage() {
  const { data: session } = useSession();
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      if (res.ok) {
        setHolidays(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch holidays", error);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!date || !description) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description }),
      });
      
      if (res.ok) {
        setDate("");
        setDescription("");
        fetchHolidays();
      } else {
        const error = await res.json();
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("Error adding holiday");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchHolidays();
      }
    } catch (error) {
      toast.error("Error deleting holiday");
    }
  };

  const isAuthorized = session?.user?.role === 'admin' || session?.user?.role === 'direktur';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <FaCalendarAlt style={{ color: '#3182ce' }} /> 
          Hari Libur Nasional
        </h1>
        <p className={styles.subtitle}>Kelola daftar hari libur nasional untuk akurasi perhitungan estimasi deadline pengerjaan.</p>
      </div>

      <div className={styles.sectionCard}>
        {isAuthorized && (
          <form onSubmit={handleAddHoliday} className={styles.formContainer}>
            <div className={styles.formGroup}>
              <label>Tanggal Libur</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label>Keterangan Hari Libur</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Contoh: Idul Fitri, Tahun Baru Baru, dsb."
                required 
              />
            </div>
            <button type="submit" disabled={isLoading} className={styles.primaryButton}>
              <FaPlus /> Tambah Hari Libur
            </button>
          </form>
        )}

        <div className={styles.listContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Tanggal</th>
                <th style={{ width: '60%' }}>Keterangan</th>
                {isAuthorized && <th style={{ width: '10%', textAlign: 'center' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={isAuthorized ? 3 : 2} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                    <FaCalendarAlt size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                    <p>Belum ada hari libur yang terdaftar.</p>
                  </td>
                </tr>
              ) : (
                holidays.map((holiday) => (
                  <tr key={holiday.id}>
                    <td style={{ fontWeight: '600' }}>
                      {new Date(holiday.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </td>
                    <td>{holiday.description}</td>
                    {isAuthorized && (
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteHoliday(holiday.id)} 
                          className={styles.iconButtonDelete}
                          title="Hapus"
                        >
                          <FaTrash size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
