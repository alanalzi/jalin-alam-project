"use client";
import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import styles from "./InquiryEditModal.module.css";
import { FaCalendarAlt, FaShoppingCart, FaUser, FaShieldAlt, FaTimes } from "react-icons/fa";
import { calculateWorkingDays } from "@/app/lib/dateUtils";

function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function InquiryEditModal({ inquiryId, isOpen, onClose, onSuccess, session, holidays }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  const userRole = session?.user?.role;
  const canAssign = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'direktur';

  useEffect(() => {
    if (isOpen && inquiryId) {
      fetchData();
    }
  }, [isOpen, inquiryId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [inqRes, usersRes, checkRes] = await Promise.all([
        fetch(`/api/inquiries/${inquiryId}`),
        fetch('/api/users/basic'),
        fetch(`/api/edit-requests?targetId=${inquiryId}&targetType=inquiry&status=pending`)
      ]);

      if (inqRes.ok) {
        const data = await inqRes.json();
        setOriginalData({ ...data });
        setFormData({
          ...data,
          request_date: formatDateForInput(data.request_date),
          image_deadline: formatDateForInput(data.image_deadline),
          assignee_ids: data.assignees ? data.assignees.map(a => a.id.toString()) : [],
          order_quantity: data.order_quantity.toString(),
        });
      }

      if (usersRes.ok) setUsersList(await usersRes.json());
      if (checkRes.ok) {
        const pending = await checkRes.json();
        setHasPendingEdit(pending.length > 0);
      }
    } catch (error) {
      console.error("Failed to fetch inquiry details", error);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssigneeChange = (userId) => {
    const uIdStr = userId.toString();
    setFormData(prev => {
      const current = prev.assignee_ids || [];
      const updated = current.includes(uIdStr)
        ? current.filter(id => id !== uIdStr)
        : [...current, uIdStr];
      return { ...prev, assignee_ids: updated };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const newPreviews = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === files.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = { 
      ...formData,
      order_quantity: Math.max(1, parseInt(formData.order_quantity) || 1)
    };

    // Handle File Upload if any
    if (selectedFiles.length > 0) {
      const uploadFormData = new FormData();
      selectedFiles.forEach(file => uploadFormData.append('images', file));

      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          payload.images = [...(payload.images || []), ...urls];
        }
      } catch (err) {
        console.error("Upload error", err);
      }
    }

    // Role-based submission
    if (userRole?.toLowerCase() === 'admin') {
      try {
        const res = await fetch('/api/edit-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_type: 'inquiry',
            target_id: formData.id,
            old_data: originalData,
            new_data: payload
          }),
        });
        if (res.ok) {
          toast.success("Perubahan Inquiry telah diajukan ke Direktur untuk divalidasi.");
          onSuccess();
          onClose();
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Direktur submission (direct)
    try {
      const res = await fetch(`/api/inquiries/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update inquiry");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={styles.modalTitle} style={{ margin: 0 }}>Edit Inquiry</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}><FaTimes /></button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading inquiry data...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {hasPendingEdit && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', color: '#1e40af' }}>
                <strong>PENDING:</strong> Inquiry ini sedang dalam proses validasi edit oleh Direktur.
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Inquiry Code</label>
              <input type="text" value={formData.inquiry_code} disabled style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            </div>

            <div className={styles.formGroup}><label>Customer Name</label><input type="text" name="customer_name" value={formData.customer_name} onChange={handleInputChange} required /></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className={styles.formGroup}><label>Email</label><input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} required /></div>
                <div className={styles.formGroup}><label>Phone</label><input type="text" name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} required /></div>
            </div>

            <div className={styles.formGroup}><label>Customer Address</label><textarea name="customer_address" value={formData.customer_address} onChange={handleInputChange} required></textarea></div>

            <div className={styles.formGroup}>
              <label>Product Name</label>
              <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className={styles.formGroup}>
                    <label>Request Date</label>
                    <input type="date" name="request_date" value={formData.request_date} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                    <label>Target Deadline</label>
                    <input type="date" name="image_deadline" value={formData.image_deadline} onChange={handleInputChange} required />
                </div>
            </div>

            {formData.request_date && formData.image_deadline && (
                <div style={{ marginBottom: '15px', fontSize: '0.85rem', color: '#0369a1', background: '#f0f9ff', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <FaCalendarAlt /> {calculateWorkingDays(formData.request_date, formData.image_deadline, holidays || [])} Hari Kerja
                </div>
            )}

            <div className={styles.formGroup}>
                <label>Order Quantity</label>
                <input type="number" name="order_quantity" value={formData.order_quantity} onChange={handleInputChange} min="1" required />
            </div>

            {canAssign && (
              <div className={styles.formGroup}>
                <label>Assignees (PIC)</label>
                <div className={styles.assigneeChecklistContainer}>
                  {usersList.map(u => (
                    <label key={u.id} className={`${styles.assigneeChecklistItem} ${formData.assignee_ids.includes(u.id.toString()) ? styles.selected : ''}`}>
                      <span className={styles.assigneeLabel}>{u.name}</span>
                      <input 
                        type="checkbox" 
                        checked={formData.assignee_ids.includes(u.id.toString())}
                        onChange={() => handleAssigneeChange(u.id)}
                        style={{ width: '18px', height: '18px' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
              <button type="submit" className={styles.saveButton} disabled={saving || hasPendingEdit}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
