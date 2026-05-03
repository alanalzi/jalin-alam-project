"use client";
import { useState, useEffect } from "react";
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
        closeApproveModal();
        fetchValidations(); // Refresh
      } else {
        alert("Failed to approve.");
      }
    } catch (error) {
      alert("Error: " + error.message);
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

  const handleEditRequestAction = async (id, status) => {
    const notes = prompt(`Masukkan catatan untuk ${status === 'approved' ? 'menyetujui' : 'menolak'} perubahan ini:`);
    if (notes === null) return;

    try {
      const res = await fetch('/api/edit-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, validation_notes: notes })
      });

      if (res.ok) {
        alert(`Berhasil ${status === 'approved' ? 'menyetujui' : 'menolak'} perubahan.`);
        fetchValidations();
      } else {
        alert("Gagal memproses permintaan edit.");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const renderDiff = (oldData, newData, targetType) => {
    const old = JSON.parse(oldData);
    const updated = JSON.parse(newData);
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
      ? ['customer_name', 'product_name', 'request_date', 'image_deadline', 'order_quantity']
      : ['name', 'category', 'description', 'startDate', 'deadline', 'type', 'order_quantity', 'status', 'assignee_ids'];

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
        'assignee_ids': 'Team Members'
      };
      return labels[f] || f.charAt(0).toUpperCase() + f.slice(1);
    };

    fieldsToCompare.forEach(field => {
      let isDifferent = false;
      
      if (field === 'assignee_ids') {
        const oldIds = Array.isArray(old[field]) ? old[field].map(String).sort() : [];
        const newIds = Array.isArray(updated[field]) ? updated[field].map(String).sort() : [];
        isDifferent = JSON.stringify(oldIds) !== JSON.stringify(newIds);
      } else {
        isDifferent = old[field] !== updated[field];
      }

      if (isDifferent) {
        let oldVal = old[field];
        let newVal = updated[field];

        if (field === 'assignee_ids') {
          let oldNames = [];
          if (Array.isArray(old['assignees'])) {
            oldNames = old['assignees'].map(a => a.name);
          } else if (Array.isArray(old[field])) {
            oldNames = old[field].map(id => users.find(u => String(u.id) === String(id))?.name || `User ${id}`);
          }
          
          let newNames = [];
          if (Array.isArray(updated['assignees'])) {
            newNames = updated['assignees'].map(a => a.name);
          } else if (Array.isArray(updated[field])) {
            newNames = updated[field].map(id => users.find(u => String(u.id) === String(id))?.name || `User ${id}`);
          }

          oldVal = oldNames.length > 0 ? oldNames.join(', ') : '(kosong)';
          newVal = newNames.length > 0 ? newNames.join(', ') : '(kosong)';
        }
        changes.push({
          field: getLabel(field),
          old: formatVal(oldVal, field),
          new: formatVal(newVal, field)
        });
      }
    });

    if (changes.length === 0) return <p className={styles.noChanges}>Perubahan pada detail teknis lainnya.</p>;

    return (
      <div className={styles.diffTable}>
        {changes.map((c, i) => (
          <div key={i} className={styles.diffRow}>
            <span className={styles.diffLabel}>{c.field}</span>
            <div className={styles.diffComparison}>
              <span className={styles.diffOld}>{c.old}</span>
              <span className={styles.diffArrow}>→</span>
              <span className={styles.diffNew}>{c.new}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionNotes.trim()) {
      alert("Alasan penolakan wajib diisi!");
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
        closeRejectModal();
        fetchValidations(); // Refresh
      } else {
        alert("Failed to reject.");
      }
    } catch (error) {
      alert("Error: " + error.message);
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
                    <Link href={`/inquiries?code=${inquiry.inquiry_code}`} style={{ textDecoration: 'none' }}>
                      <code className={styles.codeBadge} style={{ cursor: 'pointer' }}>{inquiry.inquiry_code}</code>
                    </Link>
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
                        <Link href={req.target_type === 'inquiry' ? `/inquiries?code=${JSON.parse(req.new_data).inquiry_code}` : `/product/${req.target_id}`} style={{ textDecoration: 'none' }}>
                          <span className={styles.boldText} style={{ cursor: 'pointer', color: '#1e293b' }}>
                            {req.target_type === 'inquiry' ? JSON.parse(req.new_data).product_name : JSON.parse(req.new_data).name}
                          </span>
                        </Link>
                        {req.target_type === 'inquiry' && <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Inquiry Request</p>}
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
                          onClick={() => handleEditRequestAction(req.id, 'approved')}
                        >
                          <FaCheck size={12} /> Approve
                        </button>
                        <button 
                          className={styles.rejectBtn}
                          onClick={() => handleEditRequestAction(req.id, 'rejected')}
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
                        <Link href={`/inquiries?code=${inquiry.inquiry_code}`} style={{ textDecoration: 'none' }}>
                          <code className={styles.codeBadge} style={{ cursor: 'pointer' }}>{inquiry.inquiry_code}</code>
                        </Link>
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
    </div>
  );
}
