"use client";
import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { 
  FaChevronLeft, FaChevronRight, FaTimes, FaTag, 
  FaLayerGroup, FaCalendarAlt, FaHourglassHalf, 
  FaBarcode, FaInfoCircle, FaClipboardList, FaPlus,
  FaCamera, FaPaperPlane, FaHistory, FaImage, FaUsers, FaTruck, FaCommentAlt
} from 'react-icons/fa';
import styles from './[id]/product-detail.module.css'; 

// Helper function to format date strings for display (DD-MM-YYYY)
function formatDateForDisplay(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateForInputValue(dateString) {
  if (!dateString) return '';
  let date;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    const parts = dateString.split('-');
    date = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    date = new Date(dateString);
  }
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper for user initials
function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export default function ProductDetailContent({ productId, onDataUpdate }) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAuthorized = userRole === 'admin' || userRole === 'direktur';
  const [product, setProduct] = useState(null);
  const [requiredMaterials, setRequiredMaterials] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [savedChecklist, setSavedChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Progress Updates State
  const [progressLogs, setProgressLogs] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // State for image preview modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const openImageModal = (image, isFromLog = false) => {
    if (isFromLog) {
      setPreviewImageUrl(image);
      setIsImageModalOpen(true);
    } else {
      // Gallery logic (original)
      setCurrentImageIndex(image);
      setPreviewImageUrl(null);
      setIsImageModalOpen(true);
    }
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setPreviewImageUrl(null);
  };

  const showNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const showPrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  async function fetchProgressLogs() {
    try {
      const res = await fetch(`/api/products/${productId}/progress`);
      if (res.ok) {
        const data = await res.json();
        setProgressLogs(data);
      }
    } catch (error) {
      console.error("Error fetching progress logs:", error);
    }
  }

  async function fetchProduct() {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setRequiredMaterials(data.requiredMaterials || []);
        setChecklist(data.checklist || []);
        setSavedChecklist(data.checklist || []);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
      checkPendingEdit();
    }
  }

  async function checkPendingEdit() {
    try {
      const res = await fetch(`/api/edit-requests?targetId=${productId}&targetType=product&status=pending`);
      if (res.ok) {
        const data = await res.json();
        setHasPendingEdit(data.length > 0);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const submitEditRequest = async (newData) => {
    try {
      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'product',
          target_id: productId,
          old_data: product,
          new_data: newData
        }),
      });

      if (res.ok) {
        alert("Perubahan telah diajukan ke Direktur untuk divalidasi.");
        setIsEditModalOpen(false);
        checkPendingEdit();
      } else {
        const err = await res.json();
        alert("Gagal mengajukan perubahan: " + err.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchProgressLogs();
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/checklist-templates');
        if (res.ok) {
          const data = await res.json();
          setChecklistTemplates(data);
          if (data.length > 0) setSelectedTemplate(data[0].name); 
        }
      } catch (error) {
        console.error('Error fetching checklist templates:', error);
      }
    };
    fetchTemplates();

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users/basic');
        if (res.ok) {
          setAllUsers(await res.json());
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, [productId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProgress = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    let imageUrl = null;

    // 1. Upload image if exists
    if (selectedFile) {
      const formData = new FormData();
      formData.append('images', selectedFile);

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          if (urls && urls.length > 0) imageUrl = urls[0];
        }
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    }

    // 2. Post progress update
    try {
      const res = await fetch(`/api/products/${productId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment, image_url: imageUrl }),
      });

      if (res.ok) {
        setNewComment('');
        setSelectedFile(null);
        setFilePreview(null);
        fetchProgressLogs();
      }
    } catch (error) {
      console.error("Error adding progress:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!selectedTemplate) return;
    if (checklist.some(item => item.task === selectedTemplate)) {
      alert(`Task "${selectedTemplate}" already exists.`);
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}/checklist-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: selectedTemplate, productId }),
      });

      if (res.ok) {
        fetchProduct();
        if (onDataUpdate) onDataUpdate();
      }
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  };

  const handleChecklistChange = (taskId, newPercentage) => {
    const updatedChecklist = checklist.map((task) =>
      String(task.id) === String(taskId) ? { ...task, percentage: newPercentage } : task
    );
    setChecklist(updatedChecklist);
    
    // Recalculate overall percentage based on current state
    if (updatedChecklist.length > 0) {
      const totalPercentage = updatedChecklist.reduce((sum, task) => sum + (task.percentage || 0), 0);
      const newOverallPercentage = Math.round(totalPercentage / updatedChecklist.length);
      setProduct((prev) => ({ ...prev, overallChecklistPercentage: newOverallPercentage }));
    }
  };

  const handleSaveChecklist = async () => {
    const simplifiedChecklist = checklist.map((item) => ({ 
      id: item.id, 
      percentage: item.percentage,
      task: item.task || item.task_name 
    }));



    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: simplifiedChecklist }),
      });

      if (res.ok) {
        alert('Checklist progress saved successfully!');
        await fetchProduct();
        if (onDataUpdate) onDataUpdate();
      } else {
        const errorData = await res.json();
        alert(`Failed to save: ${errorData.message || res.statusText}`);
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert(`Error saving checklist: ${error.message}`);
    }
  };

  const handleAddMember = async (userId) => {
    if (!userId) return;
    const currentAssignees = product.assignees || [];
    if (currentAssignees.some(a => a.id === parseInt(userId))) return;

    const newAssigneeIds = [...currentAssignees.map(a => a.id), parseInt(userId)];
    


    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_ids: newAssigneeIds })
      });
      if (res.ok) {
        fetchProduct();
        setIsAddingMember(false);
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleRemoveMember = async (userId) => {
    const newAssigneeIds = (product.assignees || []).filter(a => a.id !== userId).map(a => a.id);
    


    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_ids: newAssigneeIds })
      });
      if (res.ok) {
        alert('Member removed successfully');
        fetchProduct();
      } else {
        const err = await res.json();
        alert(`Failed to remove member: ${err.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert('Error removing member. Please try again.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Mark as ${newStatus}?`)) return;



    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchProduct();
        if (onDataUpdate) onDataUpdate();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatus = (product) => {
    if (!product) return 'Unknown';
    if (product.status === 'cancelled') return 'Cancelled';

    const deadline = product.deadline;
    const completedAt = product.completed_at;

    // Logic for Completed products
    if (product.status === 'completed') {
      if (!deadline || !completedAt) return 'Completed';
      
      const deadlineDate = new Date(deadline);
      const completionDate = new Date(completedAt);
      
      deadlineDate.setHours(0, 0, 0, 0);
      completionDate.setHours(0, 0, 0, 0);
      
      return completionDate > deadlineDate ? 'Late Done' : 'Completed';
    }

    // Logic for In-progress products
    if (!deadline) return 'Ongoing';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return 'Ongoing';
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today ? 'Late' : 'Ongoing';
  };

  const status = getStatus(product);
  const isValidated = product?.validation_status === 'approved';
  const isAssignee = product?.assignees?.some(a => a.id === session?.user?.id);
  const canManageChecklist = isAuthorized || userRole?.toLowerCase() === 'rnd' || isAssignee;
  const statusClass = status === 'Late' ? styles.statusLate : 
                     status === 'Late Done' ? styles.statusLateDone :
                     status === 'Completed' ? styles.statusCompleted : 
                     status === 'Cancelled' ? styles.statusCancelled : styles.statusOngoing;

  if (loading) return <div className={styles.loadingContainer}>Loading...</div>;
  if (!product) return <div className={styles.errorContainer}>Product not found.</div>;

  return (
    <div className={styles.modalBody}>
      <header className={styles.headerSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 className={styles.productNameHeader}>{product.name}</h1>
            <div className={styles.badgeStack}>
              <span className={statusClass}>{status}</span>
              <span className={styles.statusOngoing} style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>{product.category || 'General'}</span>
            </div>
            {hasPendingEdit && (
              <span style={{ 
                fontSize: '0.65rem', 
                backgroundColor: '#eff6ff', 
                color: '#2563eb', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontWeight: 'bold', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚙️ Perubahan Pending
              </span>
            )}
          </div>

        </div>
      </header>

      <div className={styles.detailGrid}>
        {/* LEFT COLUMN: Identity & Info */}
        <aside className={styles.leftCol}>
          <div className={styles.mainImageContainer}>
            <img
              src={product.images && product.images.length > 0 ? product.images[currentImageIndex] : 'https://via.placeholder.com/400?text=No+Image'}
              alt={product.name}
              className={styles.mainImage}
              onClick={() => openImageModal(currentImageIndex)}
              style={{ cursor: 'pointer' }}
            />
          </div>

          {product.images && product.images.length > 1 && (
            <div className={styles.thumbnailGrid}>
              {product.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Thumbnail ${idx}`}
                  className={`${styles.thumbnailItem} ${idx === currentImageIndex ? styles.activeThumbnail : ''}`}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}

          <div className={styles.infoCard}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <div className={styles.iconWrapper}><FaBarcode /></div>
                <div>
                  <span className={styles.metaLabel}>Product Code</span>
                  <span className={styles.metaValue}>{product.inquiry_code}</span>
                </div>
              </div>

              <div className={styles.metaItem}>
                <div className={styles.iconWrapper}><FaLayerGroup /></div>
                <div>
                  <span className={styles.metaLabel}>Type</span>
                  <span className={styles.metaValue}>{product.type || 'Standard'}</span>
                </div>
              </div>

              <div className={styles.metaItem}>
                <div className={styles.iconWrapper}><FaCalendarAlt /></div>
                <div>
                  <span className={styles.metaLabel}>Start Date</span>
                  <span className={styles.metaValue}>{formatDateForDisplay(product.startDate) || '-'}</span>
                </div>
              </div>

              <div className={styles.metaItem}>
                <div className={styles.iconWrapper}><FaHourglassHalf /></div>
                <div>
                  <span className={styles.metaLabel}>Deadline</span>
                  <span className={styles.metaValue}><span>{formatDateForDisplay(product.deadline) || 'No Deadline'}</span></span>
                </div>
              </div>

              {/* Members Section */}
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>
                  <FaUsers /> <span>Team Members</span>
                </div>
                <div className={styles.memberList}>
                  {product.assignees && product.assignees.map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberAvatar}>
                        {getInitials(member.name)}
                      </div>
                      <span className={styles.memberName}>{member.name}</span>
                      {isAuthorized && (
                        <button 
                          className={styles.removeMemberBtn}
                          onClick={() => {
                            if (confirm(`Remove ${member.name} from team?`)) {
                              handleRemoveMember(member.id);
                            }
                          }}
                          title="Remove member"
                        >
                          <FaTimes size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {isAuthorized && (
                    isAddingMember ? (
                      <div className={styles.addMemberBox}>
                        <select 
                          autoFocus
                          onBlur={() => setTimeout(() => setIsAddingMember(false), 200)}
                          onChange={(e) => handleAddMember(e.target.value)}
                          className={styles.memberSelect}
                        >
                          <option value="">Select teammate...</option>
                          {allUsers.filter(u => !product.assignees?.some(a => a.id === u.id)).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <button 
                        className={styles.addMemberBtn}
                        onClick={() => setIsAddingMember(true)}
                      >
                        <FaPlus /> Add Team Member
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.iconWrapper}><FaInfoCircle /></div>
                <div>
                  <span className={styles.metaLabel}>Main Status</span>
                  <span className={styles.metaValue}>{status}</span>
                </div>
              </div>
            </div>

            {isAuthorized && (
              <div className={styles.statusActions} style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', justifyContent: 'center' }}>
                {product.status !== 'completed' ? (
                  <button onClick={() => handleStatusChange('completed')} className={styles.completeButton} style={{ flex: 1 }}>Complete</button>
                ) : (
                  <button onClick={() => handleStatusChange('ongoing')} className={styles.resumeButton} style={{ flex: 1 }}>Resume</button>
                )}
                {product.status !== 'cancelled' && product.status !== 'completed' && (
                  <button onClick={() => handleStatusChange('cancelled')} className={styles.cancelButton}>Cancel</button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Progression & Checklist */}
        <main className={styles.rightCol}>
          <section className={styles.infoCard}>
            <div className={styles.overallProgressSection}>
              <div className={styles.progressLabel}>
                <span>Project Completion</span>
                <span>{product.overallChecklistPercentage || 0}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBarFill} style={{ width: `${product.overallChecklistPercentage || 0}%` }}></div>
              </div>
            </div>

            <div className={styles.section} style={{ marginTop: 0 }}>
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.25rem' }}>Description</h2>
              <p className={styles.productInfo} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                {product.description || 'No description provided.'}
              </p>
              
              {/* Catatan dari Tahap Inquiry */}
              {product.inquiry_validation_notes && (
                <div style={{ 
                  fontSize: "0.75rem", 
                  color: "#166534", 
                  marginTop: "12px", 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "4px",
                  backgroundColor: "#f0fdf4", 
                  padding: "10px 14px", 
                  borderRadius: "10px", 
                  borderLeft: "4px solid #10b981"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.65rem", textTransform: "uppercase" }}>
                    <FaCommentAlt size={10} /> Catatan dari Tahap Inquiry
                  </div>
                  <div style={{ fontStyle: "italic" }}>&quot;{product.inquiry_validation_notes}&quot;</div>
                </div>
              )}

              {/* Catatan dari Tahap Produk */}
              {product.validation_notes && (
                <div style={{ 
                  fontSize: "0.75rem", 
                  color: "#1e40af", 
                  marginTop: "12px", 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "4px",
                  backgroundColor: "#eff6ff", 
                  padding: "10px 14px", 
                  borderRadius: "10px", 
                  borderLeft: "4px solid #3b82f6"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.65rem", textTransform: "uppercase" }}>
                    <FaCommentAlt size={10} /> Catatan Direktur (Produk)
                  </div>
                  <div style={{ fontStyle: "italic" }}>&quot;{product.validation_notes}&quot;</div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
              <FaTruck color="#f59e0b" /> Suppliers & Materials
            </h2>
            <div className={styles.checklistContainer}>
              {requiredMaterials.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.supplierTable}>
                    <thead>
                      <tr>
                        <th>Supplier/Material</th>
                        <th>Description</th>
                        <th>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requiredMaterials.map((mat, idx) => (
                        <tr key={idx}>
                          <td><strong>{mat.material_name}</strong></td>
                          <td>{mat.supplier_description || '-'}</td>
                          <td>{mat.contact_info_text || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.noMaterials} style={{ paddingLeft: 0 }}>No suppliers or specific materials assigned to this product.</p>
              )}
            </div>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
              <FaClipboardList color="#3b82f6" /> Production Checklist
            </h2>
            <div className={styles.addChecklistTemplate}>
              <select 
                className={styles.selectTemplate} 
                value={selectedTemplate} 
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={!isValidated}
              >
                {checklistTemplates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <button 
                onClick={handleAddTemplate} 
                className={styles.addTemplateButton}
                disabled={!isValidated || !isAuthorized}
                style={{ opacity: (isValidated && isAuthorized) ? 1 : 0.6, cursor: (isValidated && isAuthorized) ? 'pointer' : 'not-allowed' }}
              >
                Add Task
              </button>
            </div>
            
            {!isValidated && (
              <div style={{ 
                backgroundColor: '#fff7ed', 
                border: '1px solid #ffedd5', 
                color: '#9a3412', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1rem', 
                fontSize: '0.85rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                <FaInfoCircle /> 
                <span>Checklist dikunci. Menunggu validasi dari Direktur.</span>
              </div>
            )}
            
            <div className={styles.checklistContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {checklist.length > 0 ? (() => {
                const firstIncompleteIndex = savedChecklist.findIndex(t => (t.percentage || 0) < 100);
                return checklist.map((task, index) => {
                  const isLocked = !isValidated || !canManageChecklist || (firstIncompleteIndex !== -1 && index > firstIncompleteIndex);
                  return (
                <div key={task.id || index} className={styles.checklistTask} style={{ opacity: isLocked ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                  <label className={styles.checklistText}>
                    {task.task || task.task_name} 
                    {isLocked && (
                      <span style={{fontSize: '0.65rem', color: '#dc2626', marginLeft: '5px'}}>
                        {!isValidated ? '(Menunggu Validasi)' : !canManageChecklist ? '(Hanya untuk Petugas/Admin)' : '(Terkunci)'}
                      </span>
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={task.percentage || 0}
                    disabled={isLocked}
                    onChange={(e) => handleChecklistChange(task.id, parseInt(e.target.value))}
                    className={styles.checklistSlider}
                    style={{ maxWidth: '150px', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                  />
                  <span className={styles.checklistPercentage}>{task.percentage || 0}%</span>
                </div>
              );
              })})() : (
                <p className={styles.noMaterials}>No tasks defined yet. Add one from the templates.</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={handleSaveChecklist} 
                className={styles.saveButton}
                disabled={!isValidated || !canManageChecklist}
                style={{ opacity: (isValidated && canManageChecklist) ? 1 : 0.6, cursor: (isValidated && canManageChecklist) ? 'pointer' : 'not-allowed' }}
              >
                Save Checklist Progress
              </button>
            </div>
          </section>
        </main>

        {/* THIRD COLUMN: Activity Feed */}
        <aside className={styles.activityCol}>
          <section className={styles.progressUpdateSection}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
              <FaHistory color="#64748b" /> Activity Feed
            </h2>
            
            {(isAuthorized || userRole?.toLowerCase() === 'rnd') && (
              <div className={styles.commentForm}>
                <textarea 
                  className={styles.commentTextarea}
                  placeholder="Write a progress update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className={styles.fileInputLabel} style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>
                      <FaImage /> Upload Gambar
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                    {filePreview && <img src={filePreview} className={styles.imagePreviewMini} alt="Preview" />}
                  </div>
                  <button 
                    className={styles.submitUpdateBtn} 
                    onClick={handleSubmitProgress}
                    disabled={isSubmitting || !newComment.trim()}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}

            <div className={styles.logList}>
              {progressLogs.length > 0 ? progressLogs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logMarker}></div>
                  <div className={styles.logBubble}>
                    <div className={styles.logHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>
                          {getInitials(log.userName)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{log.userName || 'System'}</span>
                          {log.userRole && (
                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
                              {log.userRole.charAt(0).toUpperCase() + log.userRole.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem' }}>
                        {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={styles.logComment}>{log.comment}</p>
                    {log.image_url && (
                      <img 
                        src={log.image_url} 
                        className={styles.logImage} 
                        alt="Progress" 
                        onClick={() => openImageModal(log.image_url, true)}
                      />
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                   No activity recorded yet.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {isImageModalOpen && (
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeImageModalButton} onClick={closeImageModal}><FaTimes /></button>
            {previewImageUrl ? (
              <img src={previewImageUrl} alt="Progress Large" className={styles.modalImage} />
            ) : (
              <>
                <img src={product.images[currentImageIndex]} alt="Product" className={styles.modalImage} />
                {product.images.length > 1 && (
                  <>
                    <button className={styles.prevImageButton} onClick={showPrevImage}>&lt;</button>
                    <button className={styles.nextImageButton} onClick={showNextImage}>&gt;</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {isEditModalOpen && (
        <div className={styles.imageModalOverlay}>
          <div className={styles.imageModalContent} style={{ maxWidth: '600px', width: '90%', padding: '2rem', borderRadius: '20px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>Request Edit Perubahan</h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><FaTimes size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              Sebagai <strong>Admin</strong>, setiap perubahan data utama harus disetujui oleh Direktur sebelum diterapkan.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nama Produk</label>
                <input 
                  type="text" 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Kategori</label>
                <input 
                  type="text" 
                  value={editFormData.category} 
                  onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Quantity</label>
                <input 
                  type="number" 
                  value={editFormData.order_quantity || ''} 
                  onChange={(e) => setEditFormData({...editFormData, order_quantity: e.target.value})}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Start Date</label>
                <input 
                  type="date" 
                  value={editFormData.startDate} 
                  onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Deadline</label>
                <input 
                  type="date" 
                  value={editFormData.deadline} 
                  onChange={(e) => setEditFormData({...editFormData, deadline: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Deskripsi</label>
                <textarea 
                  rows={4}
                  value={editFormData.description} 
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                onClick={() => submitEditRequest(editFormData)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Ajukan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
