"use client";
import React, { useState, useEffect } from "react";
import styles from "./InquiryEditModal.module.css";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";

function formatDisplayDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function InquiryDetailModal({ inquiryId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && inquiryId) {
      fetchData();
    }
  }, [isOpen, inquiryId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch inquiry details", error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className={styles.modalTitle} style={{ margin: 0 }}>Detail Inquiry</h2>
          <button onClick={onClose} className={styles.closeBtn} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}><FaTimes /></button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading details...</div>
        ) : !data ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Data not found.</div>
        ) : (
          <div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Inquiry Code:</span>
              <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>
                {data.inquiry_code}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Customer:</span>
              <span className={styles.detailValue}>{data.customer_name}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email:</span>
              <span className={styles.detailValue}>{data.customer_email}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone:</span>
              <span className={styles.detailValue}>{data.customer_phone}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Address:</span>
              <span className={styles.detailValue}>{data.customer_address}</span>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Product:</span>
              <span className={styles.detailValue}>{data.product_name}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description:</span>
              <span className={styles.detailValue}>{data.product_description || '-'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Request/Note:</span>
              <span className={styles.detailValue}>{data.customer_request || '-'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Qty:</span>
              <span className={styles.detailValue}>{data.order_quantity}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Request Date:</span>
              <span className={styles.detailValue}>{formatDisplayDate(data.request_date)}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Image Deadline:</span>
              <span className={styles.detailValue}>{formatDisplayDate(data.image_deadline)}</span>
            </div>

            <div className={styles.divider}></div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b' }}>Penanggung Jawab:</h4>
            <div className={styles.picContainer}>
              {data.assignees && data.assignees.length > 0 ? data.assignees.map(pic => (
                <span key={pic.id} className={styles.picBadge}>{pic.name}</span>
              )) : <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No assignees</span>}
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>Images:</h4>
              <div className={styles.imageGallery}>
                {data.images && data.images.length > 0 ? data.images.map((img, idx) => (
                  <img key={idx} src={img} alt={`Inquiry ${idx}`} className={styles.galleryImage} />
                )) : <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No images available</span>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button 
                onClick={onClose} 
                style={{ 
                  padding: '10px 24px', 
                  backgroundColor: '#3182ce', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2b6cb0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

