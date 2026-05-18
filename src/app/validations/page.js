"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import styles from "./validations.module.css";
import { FaArrowLeft, FaCheck, FaTimes, FaShieldAlt, FaInbox, FaClipboardList, FaSortAmountDown, FaSortAmountUp, FaCommentAlt } from "react-icons/fa";

export default function ValidationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState({ inquiries: [], products: [], inquiriesHistory: [], productsHistory: [], editRequests: [] });
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [inquirySortOrder, setInquirySortOrder] = useState('newest');
  const [productSortOrder, setProductSortOrder] = useState('newest');
  const [editRequests, setEditRequests] = useState([]);
  const [users, setUsers] = useState([]);

  // Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState(null); // { id, type }
  const [rejectionNotes, setRejectionNotes] = useState("");

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveItem, setApproveItem] = useState(null); // { id, type }
  const [approvalNotes, setApprovalNotes] = useState("");

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewInquiryData, setViewInquiryData] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Edit Request Modal State
  const [isEditRequestActionModalOpen, setIsEditRequestActionModalOpen] = useState(false);
  const [editRequestActionData, setEditRequestActionData] = useState(null); // { id, status }
  const [editRequestActionNotes, setEditRequestActionNotes] = useState("");

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'direktur') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchValidations();
    }
  }, [status]);

  async function fetchValidations() {
    try {
      const res = await fetch('/api/validations');
      if (res.ok) {
        const json = await res.json();
        setData(prev => ({ ...prev, ...json }));
        
        // Also fetch edit requests
        const editRes = await fetch('/api/edit-requests');
        if (editRes.ok) {
          setEditRequests(await editRes.json());
        }

        // Fetch users
        const usersRes = await fetch('/api/users/basic');
        if (usersRes.ok) {
          setUsers(await usersRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const openApproveModal = (id, type) => {
    setApproveItem({ id, type });
    setApprovalNotes("");
    setIsApproveModalOpen(true);
  };

  const closeApproveModal = () => {
    setIsApproveModalOpen(false);
    setApproveItem(null);
    setApprovalNotes("");
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/validations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: approveItem.id, 
          type: approveItem.type, 
          status: 'approved',
          notes: approvalNotes
        })
      });
      if (res.ok) {
        toast.success(`Berhasil menyetujui ${approveItem?.type === 'inquiry' ? 'Inquiry' : 'Product'}.`);
        closeApproveModal();
        fetchValidations(); // Refresh
      } else {
        toast.error("Failed to approve.");
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const openRejectModal = (id, type) => {
    setRejectItem({ id, type });
    setRejectionNotes("");
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setRejectItem(null);
    setRejectionNotes("");
  };

  const handleViewInquiry = async (id) => {
    setLoadingView(true);
    setIsViewModalOpen(true);
    setViewInquiryData(null);
    try {
      const res = await fetch(`/api/inquiries/${id}`);
      if (res.ok) {
        setViewInquiryData(await res.json());
      } else {
        toast.error("Gagal mengambil data inquiry.");
        setIsViewModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error fetching inquiry details.");
      setIsViewModalOpen(false);
    } finally {
      setLoadingView(false);
    }
  };

  const openEditRequestActionModal = (id, status) => {
    setEditRequestActionData({ id, status });
    setEditRequestActionNotes("");
    setIsEditRequestActionModalOpen(true);
  };

  const closeEditRequestActionModal = () => {
    setIsEditRequestActionModalOpen(false);
    setEditRequestActionData(null);
    setEditRequestActionNotes("");
  };

  const handleEditRequestSubmit = async (e) => {
    e.preventDefault();
    if (!editRequestActionData) return;
    const { id, status } = editRequestActionData;
    
    // Require notes if rejected (similar to normal reject)
    if (status === 'rejected' && !editRequestActionNotes.trim()) {
      toast.error("Alasan penolakan wajib diisi!");
      return;
    }

    try {
      const res = await fetch('/api/edit-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, validation_notes: editRequestActionNotes })
      });

      if (res.ok) {
        toast.success(`Berhasil ${status === 'approved' ? 'menyetujui' : 'menolak'} perubahan.`);
        fetchValidations();
        closeEditRequestActionModal();
      } else {
        toast.error("Gagal memproses permintaan edit.");
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const renderDiff = (oldData, newData, targetType) => {
    let old, updated;
    try {
      old = JSON.parse(oldData);
      updated = JSON.parse(newData);
    } catch (e) {
      console.error("Error parsing JSON for diff:", e);
      return <p className={styles.errorText}>Error: Data tidak valid.</p>;
    }
    const changes = [];

    const formatVal = (val, field) => {
      if (val === null || val === undefined || val === '') return '(kosong)';
      // Format if it's a date field
      if (field.toLowerCase().includes('date') || field.toLowerCase().includes('deadline')) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
      return val;
    };

    // Determine which fields to compare based on target type
    const fieldsToCompare = targetType === 'inquiry' 
      ? ['customer_name', 'product_name', 'request_date', 'image_deadline', 'order_quantity', 'assignee_ids', 'customer_request', 'product_description', 'customer_phone', 'customer_address', 'images']
      : ['name', 'category', 'description', 'startDate', 'deadline', 'type', 'order_quantity', 'status', 'assignee_ids', 'checklist', 'images', 'requiredMaterials'];

    const getLabel = (f) => {
      const labels = {
        'customer_name': 'Customer',
        'product_name': 'Produk',
        'request_date': 'Tgl Request',
        'image_deadline': 'Deadline Gbr',
        'order_quantity': 'Qty',
        'startDate': 'Mulai',
        'deadline': 'Deadline',
        'name': 'Nama',
        'assignee_ids': 'Team Members',
        'checklist': 'Checklist Progress',
        'images': 'Lampiran Gambar',
        'requiredMaterials': 'Supplier / Material'
      };
      return labels[f] || f.charAt(0).toUpperCase() + f.slice(1);
    };

    fieldsToCompare.forEach(field => {
      let isDifferent = false;
      
      if (field === 'assignee_ids') {
        const extractIds = (obj) => {
          if (Array.isArray(obj['assignee_ids'])) return obj['assignee_ids'].map(String).sort();
          if (Array.isArray(obj['assignees'])) return obj['assignees'].map(a => String(a.id)).sort();
          return [];
        };
        const oldIds = extractIds(old);
        const newIds = extractIds(updated);
        isDifferent = JSON.stringify(oldIds) !== JSON.stringify(newIds);
      } else if (field === 'checklist') {
        const getTasks = (obj) => {
          if (Array.isArray(obj['checklist'])) {
            return obj['checklist'].map(t => (t.task_name || t.task).trim()).sort();
          }
          return [];
        };
        isDifferent = JSON.stringify(getTasks(old)) !== JSON.stringify(getTasks(updated));
      } else if (field === 'requiredMaterials') {
        const getMaterials = (obj) => {
          if (Array.isArray(obj['requiredMaterials'])) {
            return obj['requiredMaterials'].map(m => String(m.supplier_id)).sort();
          }
          return [];
        };
        isDifferent = JSON.stringify(getMaterials(old)) !== JSON.stringify(getMaterials(updated));
      } else {
        isDifferent = old[field] !== updated[field];
      }

      let oldVal = old[field];
      let newVal = updated[field];
      let isDelta = false;
      let addedStr = null;
      let removedStr = null;

      if (field === 'assignee_ids') {
        const getNames = (obj) => {
          if (Array.isArray(obj['assignee_ids'])) {
            return obj['assignee_ids'].map(id => users.find(u => String(u.id) === String(id))?.name || `User ${id}`);
          }
          if (Array.isArray(obj['assignees'])) {
            return obj['assignees'].map(a => a.name);
          }
          return [];
        };
        
        let oldNames = getNames(old);
        let newNames = getNames(updated);

        if (isDifferent) {
          const added = newNames.filter(n => !oldNames.includes(n));
          const removed = oldNames.filter(n => !newNames.includes(n));

          isDelta = true;
          if (added.length > 0) addedStr = `Added: ${added.join(', ')}`;
          if (removed.length > 0) removedStr = `Removed: ${removed.join(', ')}`;
        }

        oldVal = oldNames.length > 0 ? oldNames.join(', ') : '(kosong)';
        newVal = newNames.length > 0 ? newNames.join(', ') : '(kosong)';
      } else if (field === 'requiredMaterials') {
        const getMatNames = (obj) => {
          if (Array.isArray(obj['requiredMaterials'])) {
            return obj['requiredMaterials'].map(m => m.supplier_name || m.material_name || `Supplier ID ${m.supplier_id}`);
          }
          return [];
        };
        
        let oldMats = getMatNames(old);
        let newMats = getMatNames(updated);

        if (isDifferent) {
          isDelta = true;
          let added = newMats.filter(n => !oldMats.includes(n));
          let removed = oldMats.filter(o => !newMats.includes(o));
          if (added.length > 0) addedStr = `Added: ${added.join(', ')}`;
          if (removed.length > 0) removedStr = `Removed: ${removed.join(', ')}`;
        }

        oldVal = oldMats.length > 0 ? oldMats.join(', ') : '(kosong)';
        newVal = newMats.length > 0 ? newMats.join(', ') : '(kosong)';
      } else if (field === 'checklist') {
        const getTasks = (obj) => {
          if (Array.isArray(obj['checklist'])) {
            return obj['checklist'].map(t => (t.task_name || t.task).trim());
          }
          return [];
        };
        
        let oldTasks = getTasks(old);
        let newTasks = getTasks(updated);

        if (isDifferent) {
          const added = newTasks.filter(t => !oldTasks.includes(t));
          const removed = oldTasks.filter(t => !newTasks.includes(t));

          isDelta = true;
          addedStr = added.length > 0 ? added.join(', ') : null;
          removedStr = removed.length > 0 ? removed.join(', ') : null;
        }

        oldVal = oldTasks.length > 0 ? oldTasks.join(', ') : '(kosong)';
        newVal = newTasks.length > 0 ? newTasks.join(', ') : '(kosong)';
      } else if (field === 'images') {
        const renderImgs = (imgs) => {
          if (!Array.isArray(imgs) || imgs.length === 0) return '(kosong)';
          return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {imgs.map((src, idx) => (
                <img 
                  key={idx} 
                  src={src} 
                  alt="Edit" 
                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'zoom-in' }} 
                  onClick={() => setPreviewImage(src)}
                />
              ))}
            </div>
          );
        };
        oldVal = renderImgs(old.images);
        newVal = renderImgs(updated.images);
      }

      changes.push({
        field: getLabel(field),
        old: formatVal(oldVal, field),
        new: formatVal(newVal, field),
        isDelta,
        added: addedStr,
        removed: removedStr,
        isDifferent
      });
    });

    if (changes.length === 0) return <p className={styles.noChanges}>Perubahan pada detail teknis lainnya.</p>;

    return (
      <div className={styles.diffTable}>
        {changes.map((c, i) => (
          <div key={i} className={styles.diffRow} style={!c.isDifferent ? { opacity: 0.8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
            <span className={styles.diffLabel} style={c.isDifferent ? { fontWeight: 'bold', color: '#1d4ed8' } : { color: '#64748b' }}>{c.field}</span>
            <div className={styles.diffComparison} style={c.isDelta ? { flexDirection: 'column', alignItems: 'flex-start', gap: '4px', backgroundColor: 'transparent', padding: 0 } : {}}>
              {c.isDifferent ? (
                c.isDelta ? (
                  <>
                    {c.added && <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>+ Ditambahkan: {c.added}</span>}
                    {c.removed && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>- Dihapus: {c.removed}</span>}
                    {!c.added && !c.removed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontStyle: 'italic' }}>Susunan tugas diubah:</span>
                        <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: '500' }}>{c.new}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className={styles.diffOld} style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{c.old}</span>
                    <span className={styles.diffArrow}>→</span>
                    <span className={styles.diffNew} style={{ fontWeight: 'bold', color: '#16a34a' }}>{c.new}</span>
                  </>
                )
              ) : (
                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '500' }}>{c.new}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionNotes.trim()) {
      toast.error("Alasan penolakan wajib diisi!");
      return;
    }
    
    try {
      const res = await fetch('/api/validations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: rejectItem.id, 
          type: rejectItem.type, 
          status: 'rejected',
          notes: rejectionNotes
        })
      });
      if (res.ok) {
        toast.success(`Berhasil menolak ${rejectItem?.type === 'inquiry' ? 'Inquiry' : 'Product'}.`);
        closeRejectModal();
        fetchValidations(); // Refresh
      } else {
        toast.error("Failed to reject.");
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className={styles.container} translate="no">
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Memuat data validasi...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'direktur') return null;

  const sortedInquiries = [...data.inquiries].sort((a, b) => {
    const dateA = new Date(a.request_date);
    const dateB = new Date(b.request_date);
    return inquirySortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const sortedProducts = [...data.products].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return productSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const sortedHistoryInquiries = [...(data.inquiriesHistory || [])].sort((a, b) => {
    const dateA = new Date(a.request_date);
    const dateB = new Date(b.request_date);
    return inquirySortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const sortedHistoryProducts = [...(data.productsHistory || [])].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return productSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.backButton}>
            <FaArrowLeft /> Kembali
          </Link>
          <h1 className={styles.title}>
            <FaShieldAlt color="#3b82f6" /> Validation
          </h1>
        </div>
      </header>

      <div className={styles.tabGroup}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Menunggu Validasi
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'edits' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('edits')}
        >
          Edit Requests
          {editRequests.length > 0 && <span className={styles.tabBadge}>{editRequests.length}</span>}
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Riwayat Validasi
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
      {/* SECTION INQUIRIES */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaClipboardList color="#10b981" /> Inquiries (Menunggu Validasi)
          </h2>
          <div className={styles.sectionActions}>
            <div className={styles.sortContainer}>
              {inquirySortOrder === 'newest' ? <FaSortAmountDown className={styles.sortIcon} /> : <FaSortAmountUp className={styles.sortIcon} />}
              <select 
                className={styles.sortSelect} 
                value={inquirySortOrder} 
                onChange={(e) => setInquirySortOrder(e.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
            <span className={styles.badgeList}>{data.inquiries.length} item</span>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Inquiry Code</th>
                <th>Customer / Product</th>
                <th>Request Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInquiries.length > 0 ? sortedInquiries.map((inquiry, idx) => (
                <tr key={inquiry.id} style={{ backgroundColor: '#fffbeb' }}>
                  <td className={styles.indexCol}>{idx + 1}</td>
                  <td>
                    <code 
                      className={styles.codeBadge} 
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                      onClick={() => handleViewInquiry(inquiry.id)}
                    >
                      {inquiry.inquiry_code}
                    </code>
                  </td>
                  <td>
                    <div className={styles.productCell}>
                      <Link href={`/inquiries?code=${inquiry.inquiry_code}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <span className={styles.boldText} style={{ cursor: 'pointer', color: '#1e293b' }}>{inquiry.customer_name}</span>
                      </Link>
                      <p className={styles.descSnippet}>{inquiry.product_name}</p>
                      {inquiry.validation_status === 'pending_delete' && (
                        <span style={{ fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '4px', display: 'inline-block' }}>Permintaan Hapus</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.dateCol}>
                    {new Date(inquiry.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className={styles.actionsCell}>
                    <button onClick={() => openApproveModal(inquiry.id, 'inquiry')} className={styles.approveBtn}>
                      <FaCheck size={12} /> Setujui
                    </button>
                    <button onClick={() => openRejectModal(inquiry.id, 'inquiry')} className={styles.rejectBtn}>
                      <FaTimes size={12} /> Tolak
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className={styles.emptyRow}>
                    <div className={styles.emptyContent}>
                      <FaInbox className={styles.emptyIcon} />
                      <span>Tidak ada inquiry yang memerlukan validasi.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION PRODUCTS */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaClipboardList color="#3b82f6" /> Products (Menunggu Validasi)
          </h2>
          <div className={styles.sectionActions}>
            <div className={styles.sortContainer}>
              {productSortOrder === 'newest' ? <FaSortAmountDown className={styles.sortIcon} /> : <FaSortAmountUp className={styles.sortIcon} />}
              <select 
                className={styles.sortSelect} 
                value={productSortOrder} 
                onChange={(e) => setProductSortOrder(e.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
            <span className={styles.badgeList}>{data.products.length} item</span>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Inquiry Code</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Penanggung Jawab</th>
                <th>Category</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.length > 0 ? sortedProducts.map((product, idx) => (
                <tr key={product.id} style={{ backgroundColor: '#fffbeb' }}>
                  <td className={styles.indexCol}>{idx + 1}</td>
                  <td>
                    <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                      <code className={styles.codeBadge} style={{ cursor: 'pointer' }}>{product.inquiry_code}</code>
                    </Link>
                  </td>
                  <td>
                    <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <span className={styles.boldText} style={{ cursor: 'pointer', color: '#1e293b' }}>{product.name}</span>
                    </Link>
                    {product.validation_status === 'pending_delete' && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '4px', display: 'block', width: 'fit-content' }}>Permintaan Hapus</span>
                    )}
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      backgroundColor: product.type === 'Custom' ? '#f5d0fe' : '#dbeafe', 
                      color: product.type === 'Custom' ? '#701a75' : '#1e40af', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontWeight: 'bold' 
                    }}>
                      {product.type === 'Custom' ? 'Custom Order' : 'New Product'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {product.assignee_names ? product.assignee_names.split(', ').map((name, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                          {name}
                        </span>
                      )) : '-'}
                    </div>
                  </td>
                  <td>{product.category || '-'}</td>
                  <td className={styles.dateCol}>
                    {new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className={styles.actionsCell}>
                    <button onClick={() => openApproveModal(product.id, 'product')} className={styles.approveBtn}>
                      <FaCheck size={12} /> Setujui
                    </button>
                    <button onClick={() => openRejectModal(product.id, 'product')} className={styles.rejectBtn}>
                      <FaTimes size={12} /> Tolak
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className={styles.emptyRow}>
                    <div className={styles.emptyContent}>
                      <FaInbox className={styles.emptyIcon} />
                      <span>Semua produk telah divalidasi.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {activeTab === 'edits' && (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FaClipboardList color="#3b82f6" /> Perubahan Data (Edit Requests)
              </h2>
              <div className={styles.badgeApproved}>{editRequests.length} item</div>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>PRODUCT NAME</th>
                    <th>REQUESTER</th>
                    <th>CHANGES</th>
                    <th>CREATED AT</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {editRequests.length > 0 ? editRequests.map((req, index) => (
                    <tr key={req.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={styles.boldText} style={{ color: '#1e293b' }}>
                            {(() => {
                              try {
                                const newData = JSON.parse(req.new_data);
                                return req.target_type === 'inquiry' ? newData.product_name : newData.name;
                              } catch (e) {
                                return 'Error parsing data';
                              }
                            })()}
                          </span>
                          {req.inquiry_id && (
                            <code 
                              className={styles.codeBadge} 
                              style={{ cursor: 'pointer', alignSelf: 'flex-start', fontSize: '0.65rem' }}
                              onClick={() => handleViewInquiry(req.inquiry_id)}
                            >
                              {(() => {
                                try {
                                  const newData = JSON.parse(req.new_data);
                                  const oldData = JSON.parse(req.old_data);
                                  return newData.inquiry_code || oldData.inquiry_code || 'Detail Inquiry';
                                } catch (e) {
                                  return 'Detail Inquiry';
                                }
                              })()}
                            </code>
                          )}
                          {req.target_type === 'inquiry' && <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Inquiry Request</p>}
                        </div>
                      </td>
                      <td>
                        <span className={styles.badgeList}>{req.requester_name}</span>
                      </td>
                      <td>
                        <div className={styles.miniDiffContainer}>
                          {renderDiff(req.old_data, req.new_data, req.target_type)}
                        </div>
                      </td>
                      <td className={styles.dateCol}>
                        {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={styles.actionsCell}>
                        <button 
                          className={styles.approveBtn}
                          onClick={() => openEditRequestActionModal(req.id, 'approved')}
                        >
                          <FaCheck size={12} /> Approve
                        </button>
                        <button 
                          className={styles.rejectBtn}
                          onClick={() => openEditRequestActionModal(req.id, 'rejected')}
                        >
                          <FaTimes size={12} /> Reject
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className={styles.emptyRow}>
                        <div className={styles.emptyContent}>
                          <FaInbox className={styles.emptyIcon} />
                          <span>Tidak ada permintaan edit yang menunggu.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          {/* SECTION HISTORY INQUIRIES */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FaClipboardList color="#10b981" /> Inquiries (Riwayat)
              </h2>
              <div className={styles.sectionActions}>
                <div className={styles.sortContainer}>
                  {inquirySortOrder === 'newest' ? <FaSortAmountDown className={styles.sortIcon} /> : <FaSortAmountUp className={styles.sortIcon} />}
                  <select 
                    className={styles.sortSelect} 
                    value={inquirySortOrder} 
                    onChange={(e) => setInquirySortOrder(e.target.value)}
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>
                <span className={styles.badgeList}>{sortedHistoryInquiries.length} item</span>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>Inquiry Code</th>
                    <th>Customer / Product</th>
                    <th>Request Date</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryInquiries.length > 0 ? sortedHistoryInquiries.map((inquiry, idx) => (
                    <tr key={inquiry.id} style={{ backgroundColor: inquiry.validation_status === 'rejected' ? '#fef2f2' : inquiry.validation_status === 'approved' ? '#f0fdf4' : 'inherit' }}>
                      <td className={styles.indexCol}>{idx + 1}</td>
                      <td>
                        <code 
                          className={styles.codeBadge} 
                          style={{ cursor: 'pointer', display: 'inline-block' }}
                          onClick={() => handleViewInquiry(inquiry.id)}
                        >
                          {inquiry.inquiry_code}
                        </code>
                      </td>
                      <td>
                        <div className={styles.productCell}>
                          <Link href={`/inquiries?code=${inquiry.inquiry_code}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <span className={styles.boldText} style={{ cursor: 'pointer', color: '#1e293b' }}>{inquiry.customer_name}</span>
                        </Link>
                          <p className={styles.descSnippet}>{inquiry.product_name}</p>
                        </div>
                      </td>
                      <td className={styles.dateCol}>
                        {new Date(inquiry.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={styles.actionsCell}>
                        {inquiry.validation_status === 'approved' ? (
                          <span className={styles.badgeApproved}><FaCheck size={12} /> Disetujui</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={styles.badgeRejected}><FaTimes size={12} /> Ditolak</span>
                            {inquiry.validation_notes && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '150px', textAlign: 'right', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaCommentAlt size={10} color="#94a3b8" /> {inquiry.validation_notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className={styles.emptyRow}>
                        <div className={styles.emptyContent}>
                          <FaInbox className={styles.emptyIcon} />
                          <span>Belum ada riwayat inquiry.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION HISTORY PRODUCTS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FaClipboardList color="#3b82f6" /> Products (Riwayat)
              </h2>
              <div className={styles.sectionActions}>
                <div className={styles.sortContainer}>
                  {productSortOrder === 'newest' ? <FaSortAmountDown className={styles.sortIcon} /> : <FaSortAmountUp className={styles.sortIcon} />}
                  <select 
                    className={styles.sortSelect} 
                    value={productSortOrder} 
                    onChange={(e) => setProductSortOrder(e.target.value)}
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>
                <span className={styles.badgeList}>{sortedHistoryProducts.length} item</span>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>Inquiry Code</th>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th>Penanggung Jawab</th>
                    <th>Category</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryProducts.length > 0 ? sortedHistoryProducts.map((product, idx) => (
                    <tr key={product.id} style={{ backgroundColor: product.validation_status === 'rejected' ? '#fef2f2' : product.validation_status === 'approved' ? '#f0fdf4' : 'inherit' }}>
                      <td className={styles.indexCol}>{idx + 1}</td>
                      <td>
                        <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                          <code className={styles.codeBadge} style={{ cursor: 'pointer' }}>{product.inquiry_code}</code>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <span className={styles.boldText} style={{ cursor: 'pointer', color: '#1e293b' }}>{product.name}</span>
                        </Link>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          backgroundColor: product.type === 'Custom' ? '#f5d0fe' : '#dbeafe', 
                          color: product.type === 'Custom' ? '#701a75' : '#1e40af', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontWeight: 'bold' 
                        }}>
                          {product.type === 'Custom' ? 'Custom Order' : 'New Product'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {product.assignee_names ? product.assignee_names.split(', ').map((name, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                              {name}
                            </span>
                          )) : '-'}
                        </div>
                      </td>
                      <td>{product.category || '-'}</td>
                      <td className={styles.dateCol}>
                        {new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={styles.actionsCell}>
                        {product.validation_status === 'approved' ? (
                          <span className={styles.badgeApproved}><FaCheck size={12} /> Disetujui</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={styles.badgeRejected}><FaTimes size={12} /> Ditolak</span>
                            {product.validation_notes && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '150px', textAlign: 'right', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaCommentAlt size={10} color="#94a3b8" /> {product.validation_notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className={styles.emptyRow}>
                        <div className={styles.emptyContent}>
                          <FaInbox className={styles.emptyIcon} />
                          <span>Belum ada riwayat produk.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reject Modal Overlay */}
      {isRejectModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tolak {rejectItem?.type === 'inquiry' ? 'Inquiry' : 'Product'}</h3>
              <button className={styles.closeBtn} onClick={closeRejectModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '12px' }}>
                  Silakan tulis alasan penolakan. Komentar ini akan dilihat oleh tim terkait agar mereka bisa memperbaikinya.
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="rejectionNotes" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                    Alasan Penolakan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="rejectionNotes"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    required
                    rows={4}
                    placeholder="Contoh: Lampiran desain tidak lengkap, mohon direvisi..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={closeRejectModal}>Batal</button>
                <button type="submit" className={styles.btnRejectSubmit}>Tolak & Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal Overlay */}
      {isApproveModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Setujui {approveItem?.type === 'inquiry' ? 'Inquiry' : 'Product'}</h3>
              <button className={styles.closeBtn} onClick={closeApproveModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleApproveSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '12px' }}>
                  Anda akan menyetujui item ini. Anda dapat menambahkan catatan atau instruksi tambahan jika diperlukan.
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="approvalNotes" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                    Catatan Persetujuan (Opsional)
                  </label>
                  <textarea
                    id="approvalNotes"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={4}
                    placeholder="Contoh: Desain sangat bagus, lanjutkan ke tahap berikutnya..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={closeApproveModal}>Batal</button>
                <button type="submit" className={styles.btnApproveSubmit} style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Setujui & Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Request Action Modal Overlay */}
      {isEditRequestActionModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editRequestActionData?.status === 'approved' ? 'Setujui' : 'Tolak'} Permintaan Perubahan
              </h3>
              <button className={styles.closeBtn} onClick={closeEditRequestActionModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleEditRequestSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '12px' }}>
                  Silakan tambahkan catatan untuk {editRequestActionData?.status === 'approved' ? 'menyetujui' : 'menolak'} perubahan ini.
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="editRequestActionNotes" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                    Catatan {editRequestActionData?.status === 'approved' ? '(Opsional)' : <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <textarea
                    id="editRequestActionNotes"
                    value={editRequestActionNotes}
                    onChange={(e) => setEditRequestActionNotes(e.target.value)}
                    required={editRequestActionData?.status === 'rejected'}
                    rows={4}
                    placeholder={editRequestActionData?.status === 'approved' ? "Catatan tambahan (opsional)..." : "Alasan penolakan..."}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={closeEditRequestActionModal}>Batal</button>
                <button 
                  type="submit" 
                  className={editRequestActionData?.status === 'approved' ? styles.btnApproveSubmit : styles.btnRejectSubmit} 
                  style={editRequestActionData?.status === 'approved' ? { backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' } : {}}
                >
                  {editRequestActionData?.status === 'approved' ? 'Setujui & Simpan' : 'Tolak & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Inquiry Modal */}
      {isViewModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsViewModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detail Inquiry</h3>
              <button className={styles.closeBtn} onClick={() => setIsViewModalOpen(false)}><FaTimes /></button>
            </div>
            <div className={styles.modalBody}>
              {loadingView ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className={styles.spinner} style={{ margin: '0 auto', marginBottom: '1rem' }}></div>
                  <p>Memuat data...</p>
                </div>
              ) : viewInquiryData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div><strong>Inquiry Code:</strong> <span className={styles.codeBadge}>{viewInquiryData.inquiry_code}</span></div>
                  <div><strong>Customer:</strong> {viewInquiryData.customer_name}</div>
                  <div><strong>Email:</strong> {viewInquiryData.customer_email || '-'}</div>
                  <div><strong>Phone:</strong> {viewInquiryData.customer_phone || '-'}</div>
                  <div><strong>Address:</strong> {viewInquiryData.customer_address || '-'}</div>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }}></div>
                  <div><strong>Product:</strong> {viewInquiryData.product_name}</div>
                  <div><strong>Description:</strong> {viewInquiryData.product_description || '-'}</div>
                  <div><strong>Request/Note:</strong> {viewInquiryData.customer_request || '-'}</div>
                  <div><strong>Qty:</strong> {viewInquiryData.order_quantity}</div>
                  <div><strong>Request Date:</strong> {new Date(viewInquiryData.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {viewInquiryData.image_deadline && (
                    <div><strong>Image Deadline:</strong> {new Date(viewInquiryData.image_deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  )}
                  {viewInquiryData.assignees?.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Penanggung Jawab:</strong>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {viewInquiryData.assignees.map(a => (
                          <span key={a.id} style={{ fontSize: '0.75rem', padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>{a.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewInquiryData.images?.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Images:</strong>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {viewInquiryData.images.map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Img ${i+1}`} 
                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'zoom-in' }} 
                            onClick={() => setPreviewImage(img)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>Data tidak ditemukan.</div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setIsViewModalOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              <FaTimes />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
