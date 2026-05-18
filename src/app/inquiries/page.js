"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from "next-auth/react";
import Link from "next/link";
import styles from "./inquiries.module.css";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { 
  FaArrowLeft, FaEdit, FaTrash, FaPlus, FaUser, 
  FaCalendarAlt, FaShoppingCart, FaList, 
  FaSortAmountDown, FaSortAmountUp, FaCheck, FaTimes, FaCommentAlt 
} from "react-icons/fa";
import { calculateWorkingDays, fetchHolidaysFromAPI } from "@/app/lib/dateUtils";

function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShortDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function InquiryManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const mounted = useRef(false);

  const [inquiries, setInquiries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [dayViewDate, setDayViewDate] = useState(null);
  const [listSortOrder, setListSortOrder] = useState('newest');
  const [pendingEdits, setPendingEdits] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [holidays, setHolidays] = useState([]);

  const [formData, setFormData] = useState({ 
    id: null, 
    inquiry_code: "", 
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    product_name: "", 
    product_description: "", 
    customer_request: "", 
    request_date: "", 
    image_deadline: "", 
    order_quantity: "",
    images: [],
    assignee_ids: []
  });

  const userRole = session?.user?.role;
  const canAssign = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'direktur';

  const handleInquiryCodeClick = async (inquiryParam) => {
    try {
      const code = typeof inquiryParam === 'object' ? inquiryParam.inquiry_code : inquiryParam;
      const res = await fetch(`/api/products?inquiryCode=${code}`);
      if (res.ok) {
        const products = await res.json();
        if (mounted.current && products.length > 0) {
          router.push(`/product/${products[0].id}`);
        } else if (mounted.current) {
          router.push(`/product?addInquiryCode=${code}`);
        }
      } else {
        let errorMsg = `Failed to find product. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error navigating to product:", error);
      if (mounted.current) {
        toast.error(`Error: ${String(error.message)}`);
      }
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    if (mounted.current) {
      setIsModalOpen(false);
      setFormData({ 
        id: null, 
        inquiry_code: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_address: "",
        product_name: "", 
        product_description: "", 
        customer_request: "", 
        request_date: "", 
        image_deadline: "", 
        order_quantity: "",
        images: [],
        assignee_ids: []
      });
      setSelectedFiles([]);
      setImagePreviews([]);
      setHasPendingEdit(false);
      setOriginalData(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (mounted.current) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

    const fileReaders = [];
    const newPreviews = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mounted.current) {
          newPreviews.push(reader.result);
          if (newPreviews.length === files.length) {
            setImagePreviews(newPreviews);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const todayStr = formatDateForInput(new Date());
    
    if (!formData.id && formData.request_date < todayStr) {
      toast.error("Start date (Request Date) tidak boleh hari sebelum hari ini.");
      return;
    }
    
    if (formData.request_date && formData.image_deadline) {
      if (formData.image_deadline < formData.request_date) {
        toast.error("Deadline (Target Deadline) tidak boleh sebelum Start Date.");
        return;
      }
    }

    if (!formData.assignee_ids || formData.assignee_ids.length === 0) {
      toast.error("Harap pilih setidaknya satu assignee (PIC).");
      return;
    }

    if (selectedFiles.length === 0 && (!formData.images || formData.images.length === 0)) {
      toast.error("Harap unggah setidaknya satu gambar inquiry.");
      return;
    }

    const url = formData.id ? `/api/inquiries/${formData.id}` : '/api/inquiries';
    const method = formData.id ? 'PUT' : 'POST';
    const payload = { 
      ...formData,
      order_quantity: Math.max(1, parseInt(formData.order_quantity) || 1)
    };

    if (selectedFiles.length > 0) {
      const uploadFormData = new FormData();
      selectedFiles.forEach(file => {
        uploadFormData.append('images', file);
      });

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          payload.images = [...(payload.images || []), ...urls];
        } else {
          let errorMsg = `Failed to upload images. Status: ${uploadRes.status}`;
          try {
            const errorData = await uploadRes.json();
            errorMsg = errorData.message || errorMsg;
          } catch (jsonErr) { }
          throw new Error(errorMsg);
        }
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        if (mounted.current) {
          toast.error(`Error uploading images: ${String(uploadError.message)}`);
        }
        return;
      }
    }

    if (userRole?.toLowerCase() === 'admin' && formData.id) {
      let hasChanges = false;
      const fields = ['customer_name', 'customer_email', 'customer_phone', 'customer_address', 'product_name', 'product_description', 'customer_request', 'request_date', 'image_deadline', 'order_quantity'];
      for (const field of fields) {
        let oldVal = originalData[field];
        if (field === 'request_date' || field === 'image_deadline') {
          oldVal = formatDateForInput(oldVal);
        }
        if (String(oldVal || '') !== String(payload[field] || '')) {
          hasChanges = true;
          break;
        }
      }
      
      if (!hasChanges) {
        const oldAssignees = (originalData.assignees || []).map(a => String(a.id)).sort().join(',');
        const newAssignees = [...(payload.assignee_ids || [])].sort().join(',');
        if (oldAssignees !== newAssignees) hasChanges = true;
      }
      
      if (!hasChanges && selectedFiles.length > 0) {
        hasChanges = true;
      }

      if (!hasChanges) {
        toast("Tidak ada perubahan yang dilakukan.", { icon: 'ℹ️' });
        closeModal();
        return;
      }

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
          closeModal();
          return;
        } else {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengajukan perubahan.");
        }
      } catch (err) {
        toast.error(err.message);
        return;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (mounted.current) {
          const [inqRes, editRes] = await Promise.all([
            fetch('/api/inquiries'),
            fetch('/api/edit-requests?status=pending&targetType=inquiry')
          ]);
          if (inqRes.ok) setInquiries(await inqRes.json());
          if (editRes.ok) setPendingEdits(await editRes.json());
          closeModal();
        }
      } else {
        let errorMsg = `Failed to save inquiry. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonErr) { }
        console.error(errorMsg);
        if (mounted.current) {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      if (mounted.current) {
        toast.error(String(error.message));
      }
    }
  };

  const handleEdit = async (inquiry) => {
    try {
      const checkRes = await fetch(`/api/edit-requests?targetId=${inquiry.id}&targetType=inquiry&status=pending`);
      if (checkRes.ok) {
        const pending = await checkRes.json();
        setHasPendingEdit(pending.length > 0);
      }

      const res = await fetch(`/api/inquiries/${inquiry.id}`);
      if (res.ok) {
        const data = await res.json();
        setOriginalData({ ...data });
        if (mounted.current) {
          setFormData({
            ...data,
            request_date: formatDateForInput(data.request_date),
            inquiry_code: data.inquiry_code || '',
            customer_name: data.customer_name || '',
            customer_email: data.customer_email || '',
            customer_phone: data.customer_phone || '',
            customer_address: data.customer_address || '',
            order_quantity: data.order_quantity.toString(),
            image_deadline: formatDateForInput(data.image_deadline),
            assignee_ids: data.assignees ? data.assignees.map(a => a.id.toString()) : [],
            images: data.images || [],
          });
          setSelectedFiles([]);
          setImagePreviews([]);
          openModal();
        }
      } else {
        let errorMsg = `Failed to fetch inquiry details. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error in handleEdit:", error);
      if (mounted.current) {
        toast.error(String(error.message));
      }
    }
  };

  const handleDelete = async (inquiryId) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.message && mounted.current) {
          toast.success(data.message);
        }
        if (mounted.current) {
          const [inqRes, editRes] = await Promise.all([
            fetch('/api/inquiries'),
            fetch('/api/edit-requests?status=pending&targetType=inquiry')
          ]);
          if (inqRes.ok) setInquiries(await inqRes.json());
          if (editRes.ok) setPendingEdits(await editRes.json());
        }
      } else {
        let errorMsg = `Failed to delete inquiry. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Error in handleDelete:", err);
      if (mounted.current) {
        toast.error(`Error: ${String(err.message)}`);
      }
    }
  };

  const calendarEvents = useMemo(() => {
    return inquiries.map(inquiry => {
      const productStatusLower = inquiry.product_status?.toLowerCase() || '';
      const isComplete = productStatusLower === 'done' || productStatusLower === 'selesai' || productStatusLower === 'completed';
      const isLate = productStatusLower === 'late';
      const isLateDone = productStatusLower === 'late done';
      
      let backgroundColor = '#3182ce';
      if (isComplete) backgroundColor = '#22c55e';
      else if (isLate) backgroundColor = '#ef4444';
      else if (isLateDone) backgroundColor = '#f97316';
      else if (inquiry.product_id) {
        if (inquiry.product_validation_status === 'pending') backgroundColor = '#eab308';
        else if (inquiry.product_validation_status === 'rejected') backgroundColor = '#ef4444';
        else backgroundColor = '#16a34a';
      }
      else if (inquiry.validation_status === 'rejected') backgroundColor = '#ef4444';
      else if (inquiry.validation_status === 'pending') backgroundColor = '#eab308';

      return {
        id: inquiry.id,
        title: `${inquiry.customer_name} - ${inquiry.product_name || 'No Product'}`,
        start: inquiry.request_date,
        allDay: true,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          ...inquiry
        }
      };
    });
  }, [inquiries]);

  const handleEventClick = (clickInfo) => {
    const dateStr = formatDateForInput(clickInfo.event.extendedProps.request_date);
    setDayViewDate(dateStr);
  };

  const handleDateClick = (arg) => {
    setDayViewDate(arg.dateStr);
  };

  const sortedInquiriesList = [...inquiries].sort((a, b) => {
    const dateA = new Date(a.request_date);
    const dateB = new Date(b.request_date);
    return listSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const inquiryDayStats = useMemo(() => {
    const stats = {};
    inquiries.forEach(inq => {
      const d = formatDateForInput(inq.request_date);
      const currentStatus = inq.validation_status || 'pending';
      
      if (!stats[d]) {
        stats[d] = { count: 0, status: currentStatus };
      }
      
      stats[d].count++;
      
      const p = { 'approved': 3, 'pending': 2, 'rejected': 1 };
      if (p[currentStatus] > p[stats[d].status]) {
        stats[d].status = currentStatus;
      }
    });
    return stats;
  }, [inquiries]);

  useEffect(() => {
    mounted.current = true;
    
    const fetchData = async () => {
      try {
        const [inqRes, editRes, usersRes, holidayDates] = await Promise.all([
          fetch('/api/inquiries'),
          fetch('/api/edit-requests?status=pending&targetType=inquiry'),
          fetch('/api/users/basic'),
          fetchHolidaysFromAPI()
        ]);
        
        if (inqRes.ok && mounted.current) setInquiries(await inqRes.json());
        if (editRes.ok && mounted.current) setPendingEdits(await editRes.json());
        if (usersRes.ok && mounted.current) setUsersList(await usersRes.json());
        if (mounted.current) setHolidays(holidayDates);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    
    fetchData();

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && inquiries.length > 0) {
      const target = inquiries.find(inq => inq.inquiry_code === code);
      if (target) {
        setDayViewDate(formatDateForInput(target.request_date));
        setViewMode('calendar');
      }
    }
  }, [searchParams, inquiries]);

  return (
    <div className={styles.pageContainer} translate="no">
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Back to Dashboard</span></Link>
      </div>
      <h1 className={styles.title}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Inquiry Management</span>
          <div className={styles.viewToggleGroup}>
            <button 
              onClick={() => { setViewMode('calendar'); setDayViewDate(null); }} 
              className={`${styles.viewToggleBtn} ${viewMode === 'calendar' ? styles.active : ''}`}
            >
              <FaCalendarAlt /> Calendar
            </button>
            <button 
              onClick={() => { setViewMode('list'); setDayViewDate(null); }} 
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
            >
              <FaList /> List
            </button>
          </div>
        </div>
        {canAssign && (
          <button onClick={() => {
            if (mounted.current) {
              setFormData({
                id: null,
                inquiry_code: "",
                customer_name: "",
                customer_email: "",
                customer_phone: "",
                customer_address: "",
                product_name: "",
                product_description: "",
                customer_request: "",
                request_date: "",
                image_deadline: "",
                order_quantity: "",
                assignee_ids: []
              });
              openModal();
            }
          }} className={styles.addButton}>
            <FaPlus /> Add Inquiry
          </button>
        )}
      </h1>

      {viewMode === 'list' ? (
        <div className={styles.listContainer}>
          <div className={styles.listToolbar}>
            <div className={styles.sortContainer}>
              {listSortOrder === 'newest' ? <FaSortAmountDown className={styles.sortIcon} /> : <FaSortAmountUp className={styles.sortIcon} />}
              <select 
                className={styles.sortSelect} 
                value={listSortOrder} 
                onChange={(e) => setListSortOrder(e.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
            <span className={styles.badgeList}>{inquiries.length} item</span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>No</th>
                  <th>Inquiry Code</th>
                  <th>Customer / Product</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedInquiriesList.length > 0 ? sortedInquiriesList.map((inquiry, idx) => (
                  <tr key={inquiry.id} className={styles.clickableRow} onClick={() => handleInquiryCodeClick(inquiry)}>
                    <td className={styles.indexCol}>{idx + 1}</td>
                    <td>
                      <code className={styles.codeBadge}>{inquiry.inquiry_code}</code>
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <span className={styles.boldText}>{inquiry.customer_name}</span>
                        <p className={styles.descSnippet}>{inquiry.product_name || 'No Product'}</p>
                      </div>
                    </td>
                    <td className={styles.dateCol}>
                      {formatDisplayDate(inquiry.request_date)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {!!(pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit) && (
                          <span style={{
                            fontSize: '0.6rem', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontWeight: 'bold', 
                            width: 'fit-content',
                            border: '1px solid #bfdbfe'
                          }}>⚙️ EDIT PENDING</span>
                        )}
                        {inquiry.validation_status === 'pending' && <span style={{fontSize: '0.7rem', backgroundColor: '#fef9c3', color: '#854d0e', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #fef08a', whiteSpace: 'nowrap'}}>⏳ Pending</span>}
                        {inquiry.validation_status === 'approved' && !inquiry.product_id && (
                          <span style={{fontSize: '0.7rem', backgroundColor: '#f0fdfa', color: '#0d9488', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #ccfbf1', whiteSpace: 'nowrap'}}>
                            ✅ Approved (Belum Ada Produk)
                          </span>
                        )}
                        {inquiry.validation_status === 'approved' && inquiry.product_id && (
                          <span style={{fontSize: '0.7rem', backgroundColor: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #bbf7d0', whiteSpace: 'nowrap'}}>
                            ✅ Approved (Sudah Ada Produk)
                          </span>
                        )}
                        {inquiry.validation_status === 'rejected' && <span style={{fontSize: '0.7rem', backgroundColor: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #fee2e2', whiteSpace: 'nowrap'}}>❌ Rejected</span>}
                        {inquiry.validation_status === 'pending_delete' && <span style={{fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #fecaca', whiteSpace: 'nowrap'}}>🗑️ Menunggu Hapus</span>}
                        {inquiry.product_status?.toLowerCase() === 'cancelled' && (
                          <span style={{fontSize: '0.7rem', backgroundColor: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', border: '1px solid #fee2e2', whiteSpace: 'nowrap'}}>
                            🚫 Cancelled
                          </span>
                        )}
                        
                        {inquiry.validation_notes && (
                          <div style={{ 
                            fontSize: '0.65rem', 
                            color: inquiry.validation_status === 'rejected' ? '#ef4444' : '#64748b', 
                            fontStyle: 'italic', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            backgroundColor: inquiry.validation_status === 'rejected' ? '#fef2f2' : '#f8fafc',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            borderLeft: `2px solid ${inquiry.validation_status === 'rejected' ? '#ef4444' : '#3b82f6'}`,
                            maxWidth: '180px'
                          }}>
                            <FaCommentAlt size={10} color={inquiry.validation_status === 'rejected' ? '#ef4444' : '#3b82f6'} />
                            <span>{inquiry.validation_notes}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={styles.actionsCell}>
                      {canAssign && (
                        <>
                          <button 
                            className={styles.iconButton} 
                            onClick={(e) => { e.stopPropagation(); handleEdit(inquiry); }} 
                            title="Edit"
                            disabled={inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_status?.toLowerCase() === 'cancelled'}
                            style={(inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_status?.toLowerCase() === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className={styles.iconButtonDelete} 
                            onClick={(e) => { e.stopPropagation(); handleDelete(inquiry.id); }} 
                            title="Delete"
                            disabled={inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit}
                            style={(inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Tidak ada data inquiry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : !dayViewDate ? (
        <div className={styles.calendarContainer}>
          <FullCalendar
            key={viewMode}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin]}
            initialView="dayGridMonth"
            navLinks={false}
            views={{
              multiMonthYear: {
                buttonText: 'Tahun',
                multiMonthMaxColumns: 4,
                dayCellContent: (arg) => {
                  const d = formatDateForInput(arg.date);
                  const stat = inquiryDayStats[d];
                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '30px' }}>
                      <span style={{ fontSize: '0.8rem' }}>{arg.dayNumberText}</span>
                      {stat && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '-2px', 
                          right: '-2px', 
                          backgroundColor: stat.status === 'approved' ? '#22c55e' : stat.status === 'rejected' ? '#ef4444' : '#eab308',
                          color: 'white',
                          borderRadius: '50%',
                          width: '14px',
                          height: '14px',
                          fontSize: '0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}>
                          {stat.count}
                        </div>
                      )}
                    </div>
                  );
                }
              },
              dayGridMonth: {
                buttonText: 'Bulan'
              }
            }}
            dayCellClassNames={(arg) => {
              const d = formatDateForInput(arg.date);
              const stat = inquiryDayStats[d];
              const day = arg.date.getDay();
              const isWeekend = day === 0 || day === 6;
              const isHoliday = holidays.includes(d);
              
              let classes = [];
              if (isWeekend || isHoliday) classes.push('is-red-day');
              if (stat) classes.push(`has-inquiry-${stat.status}`);
              
              return classes.join(' ');
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'multiMonthYear,dayGridMonth'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            editable={false}
            selectable={true}
            eventContent={(arg) => {
               const inq = arg.event.extendedProps;
               const qty = Number(inq.order_quantity);
               const productStatusLower = inq.product_status?.toLowerCase() || '';
               const isComplete = productStatusLower === 'done' || productStatusLower === 'selesai' || productStatusLower === 'completed';
               return (
                 <div className={styles.eventContent}>
                   <div className={styles.eventTitle}>
                     {isComplete && <span style={{ marginRight: '4px' }}>✅</span>}
                     {arg.event.title}
                   </div>
                   {qty > 0 ? <div className={styles.eventSub}><FaShoppingCart size={8} /> {qty}</div> : null}
                 </div>
               )
            }}
          />
        </div>
      ) : (
        <div className={styles.dayViewContainer}>
          <div className={styles.dayViewHeader} style={{ justifyContent: 'flex-start', gap: '24px' }}>
            <button onClick={() => setDayViewDate(null)} className={styles.closeDayViewBtn}>
              <FaArrowLeft size={14} /> Back to Calendar
            </button>
            <div className={styles.dayViewTitle}>
              <FaCalendarAlt color="#3182ce" />
              Inquiries for {formatDisplayDate(dayViewDate)}
            </div>
          </div>
          
          <div className={styles.columnContent}>
            {inquiries.filter(inq => formatDateForInput(inq.request_date) === dayViewDate).length === 0 ? (
               <div style={{ padding: '20px', color: '#64748b', fontStyle: 'italic' }}>No inquiries for this date.</div>
            ) : (
               inquiries.filter(inq => formatDateForInput(inq.request_date) === dayViewDate).map(inquiry => {
                 const productStatusLower = inquiry.product_status?.toLowerCase() || '';
                 const isComplete = productStatusLower === 'done' || productStatusLower === 'selesai' || productStatusLower === 'completed';
                 const isLate = productStatusLower === 'late';

                 return (
                    <div key={inquiry.id} className={styles.inquiryCard} onClick={() => handleInquiryCodeClick(inquiry)} style={{ cursor: "pointer" }}>
                      <div className={styles.cardHeader} style={{ flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                          <div className={styles.customerName}>
                            {inquiry.customer_name}
                            {inquiry.validation_status === "approved" && !inquiry.product_id && (
                              <span style={{marginLeft: "8px", fontSize: "0.65rem", backgroundColor: "#f0fdfa", color: "#0d9488", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #ccfbf1", whiteSpace: "nowrap"}}>
                                ✅ Approved (Belum Ada Produk)
                              </span>
                            )}
                            {inquiry.validation_status === "approved" && inquiry.product_id && (
                              <span style={{marginLeft: "8px", fontSize: "0.65rem", backgroundColor: "#f0fdf4", color: "#166534", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #bbf7d0", whiteSpace: "nowrap"}}>
                                ✅ Approved (Sudah Ada Produk)
                              </span>
                            )}
                            {inquiry.validation_status === "pending" && <span style={{marginLeft: "8px", fontSize: "0.65rem", backgroundColor: "#fef9c3", color: "#854d0e", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #fef08a", whiteSpace: "nowrap"}}>⏳ Pending</span>}
                            {inquiry.validation_status === "rejected" && <span style={{marginLeft: "8px", fontSize: "0.65rem", backgroundColor: "#fef2f2", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #fee2e2", whiteSpace: "nowrap"}}>❌ Rejected</span>}
                            {inquiry.validation_status === "pending_delete" && <span style={{marginLeft: "8px", fontSize: "0.65rem", backgroundColor: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #fecaca", whiteSpace: "nowrap"}}>🗑️ Menunggu Hapus</span>}
                          </div>
                          <div className={styles.inquiryCode} onClick={(e) => { e.stopPropagation(); handleInquiryCodeClick(inquiry); }}>{inquiry.inquiry_code}</div>
                        </div>
                        {!!pendingEdits.some(e => e.target_id === inquiry.id) && (
                          <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.6rem", backgroundColor: "#eff6ff", color: "#2563eb", padding: "3px 10px", borderRadius: "20px", fontWeight: "800", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>⚙️ Edit Request Pending</div>
                        )}
                      </div>
                      {inquiry.validation_notes && (
                        <div style={{ 
                          fontSize: "0.75rem", 
                          color: inquiry.validation_status === "rejected" ? "#991b1b" : "#1e40af", 
                          marginTop: "8px", 
                          display: "flex", 
                          flexDirection: "column",
                          gap: "4px",
                          backgroundColor: inquiry.validation_status === "rejected" ? "#fef2f2" : "#eff6ff", 
                          padding: "8px 12px", 
                          borderRadius: "8px", 
                          borderLeft: "4px solid " + (inquiry.validation_status === "rejected" ? "#ef4444" : "#3b82f6"),
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <FaCommentAlt size={10} /> {inquiry.validation_status === "rejected" ? "Alasan Penolakan" : "Catatan Direktur"}
                          </div>
                          <div style={{ fontStyle: "italic", lineHeight: "1.4" }}>
                            &quot;{inquiry.validation_notes}&quot;
                          </div>
                        </div>
                      )}
                      <div className={styles.cardRequest}>{inquiry.customer_request || inquiry.product_name || "No Request Details"}</div>
                      {inquiry.assignees && inquiry.assignees.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "5px", marginBottom: "8px" }}>
                          {inquiry.assignees.map(a => <div key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: "600", color: "#1a202c", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}><FaUser size={10}/> <span>{a.name}</span></div>)}
                        </div>
                      )}
                      <div className={styles.cardImageContainer}><img src={inquiry.images && inquiry.images.length > 0 ? inquiry.images[0] : "https://via.placeholder.com/300x200?text=No+Image"} className={styles.cardImage} /></div>
                      <div className={styles.cardFooter}>
                        <div className={styles.cardTags}>
                          <span className={styles.tagDate}><FaCalendarAlt size={10} /> {formatShortDate(inquiry.request_date)}</span>
                          {Number(inquiry.order_quantity) > 0 && <span className={styles.tagQuantity}><FaShoppingCart size={10} /> {inquiry.order_quantity}</span>}
                          {inquiry.product_id ? (
                            <span style={{ 
                              fontSize: "0.65rem", 
                              fontWeight: "bold", 
                              padding: "2px 8px", 
                              borderRadius: "4px", 
                              backgroundColor: inquiry.product_status?.toLowerCase() === 'cancelled' ? '#fee2e2' : inquiry.product_validation_status === "pending" ? "#fef08a" : inquiry.product_validation_status === "rejected" ? "#fee2e2" : (inquiry.product_status === "done" ? "#22c55e" : (inquiry.product_status === "late" ? "#ef4444" : (inquiry.product_status === "Late Done" ? "#ffedd5" : "#dcfce7"))), 
                              color: inquiry.product_status?.toLowerCase() === 'cancelled' ? '#991b1b' : inquiry.product_validation_status === "pending" ? "#854d0e" : inquiry.product_validation_status === "rejected" ? "#991b1b" : (inquiry.product_status === "Late Done" ? "#c2410c" : "#166534"), 
                              border: inquiry.product_status === "Late Done" ? "1px solid #fdba74" : "1px solid currentColor", 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: "4px" 
                            }}>
                              {inquiry.product_status?.toLowerCase() === 'cancelled' ? "🚫 Cancelled" : inquiry.product_validation_status === "pending" ? "⏳ Menunggu Approval Produk" : inquiry.product_validation_status === "rejected" ? "❌ Produk Ditolak" : (inquiry.product_status === "done" ? "✅ Complete" : (inquiry.product_status === "late" ? "⚠️ Late" : (inquiry.product_status === "Late Done" ? "Late Done" : (inquiry.product_status ? "⏳ " + inquiry.product_status : "✔ Linked"))))}
                            </span>
                          ) : <span style={{ fontSize: "0.65rem", fontWeight: "bold", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}>No Product</span>}
                        </div>
                      </div>
                      {canAssign && (
                        <div className={styles.cardActions}>
                          <button 
                            className={styles.iconButton} 
                            onClick={(e) => { e.stopPropagation(); handleEdit(inquiry); }}
                            disabled={inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_validation_status === 'pending' || inquiry.product_status?.toLowerCase() === 'cancelled'}
                            style={(inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_validation_status === 'pending' || inquiry.product_status?.toLowerCase() === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className={styles.iconButtonDelete} 
                            onClick={(e) => { e.stopPropagation(); handleDelete(inquiry.id); }}
                            disabled={inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_validation_status === 'pending' || inquiry.product_status?.toLowerCase() === 'cancelled'}
                            style={(inquiry.validation_status === 'pending' || inquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === inquiry.id) || inquiry.product_has_pending_edit || inquiry.product_validation_status === 'pending' || inquiry.product_status?.toLowerCase() === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </div>
                 );
               })
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div key="inquiry-modal-overlay" className={styles.modalOverlay}>
          <div key="inquiry-modal-content" className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{formData.id ? "Edit Inquiry" : "Add New Inquiry"}</h2>
            <form onSubmit={handleSubmit}>
              {hasPendingEdit && (
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #3b82f6', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  color: '#1e40af'
                }}>
                  <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>PENDING</div>
                  <span style={{ fontSize: '0.85rem' }}>Inquiry ini sedang dalam proses validasi edit oleh Direktur.</span>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Inquiry Code</label>
                <input
                  type="text"
                  name="inquiry_code"
                  value={formData.inquiry_code}
                  onChange={handleInputChange}
                  placeholder="Leave blank to auto-generate"
                  disabled={!!formData.id}
                  style={formData.id ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                />
              </div>

              <div className={styles.formGroup}><label>Customer Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" name="customer_name" value={formData.customer_name} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Customer Email <span style={{ color: '#ef4444' }}>*</span></label><input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Customer Phone <span style={{ color: '#ef4444' }}>*</span></label><input type="text" name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Customer Address <span style={{ color: '#ef4444' }}>*</span></label><textarea name="customer_address" value={formData.customer_address} onChange={handleInputChange} required></textarea></div>

              <div className={styles.formGroup}>
                <label>Inquiry Images <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
                <div className={styles.imagePreviewContainer}>
                  {imagePreviews.map((src, index) => (
                    <img key={index} src={src} alt="Preview" width={100} height={100} style={{ objectFit: 'cover', borderRadius: '5px' }} />
                  ))}
                  {formData.images && formData.images.map((imgSrc, index) => (
                    <div key={`existing-${index}`} style={{ position: 'relative' }}>
                      <img src={imgSrc} alt="Existing" width={100} height={100} style={{ objectFit: 'cover', borderRadius: '5px' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}><label>Product Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Product Description</label><textarea name="product_description" value={formData.product_description} onChange={handleInputChange}></textarea></div>
              <div className={styles.formGroup}><label>Customer Request</label><textarea name="customer_request" value={formData.customer_request} onChange={handleInputChange}></textarea></div>
              <div className={styles.formGroup}>
                <label>Request Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="date" 
                  name="request_date" 
                  value={formData.request_date} 
                  onChange={handleInputChange} 
                  min={!formData.id ? formatDateForInput(new Date()) : undefined}
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Target Deadline <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="date" 
                  name="image_deadline" 
                  value={formData.image_deadline} 
                  onChange={handleInputChange} 
                  min={formData.request_date ? formData.request_date : undefined}
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Order Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="number" 
                  name="order_quantity" 
                  value={formData.order_quantity || ""} 
                  onChange={handleInputChange} 
                  placeholder="1"
                  min="1"
                  required 
                />
              </div>
              
              {formData.request_date && formData.image_deadline && (
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '12px 18px', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '12px', 
                  border: '1px solid #bae6fd',
                  borderLeft: '4px solid #0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.95rem',
                  color: '#0369a1'
                }}>
                  <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '50%', color: '#0ea5e9' }}>
                    <FaCalendarAlt size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: '#0c4a6e' }}>
                      {calculateWorkingDays(formData.request_date, formData.image_deadline, holidays)} Hari Kerja
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                      Estimasi ini sudah memotong <strong>Sabtu, Minggu</strong>
                      {(() => {
                        const s = new Date(formData.request_date);
                        s.setHours(0,0,0,0);
                        const e = new Date(formData.image_deadline);
                        e.setHours(0,0,0,0);
                        const overlaps = holidays.filter(h => {
                          const hd = new Date(h);
                          hd.setHours(0,0,0,0);
                          const day = hd.getDay();
                          return hd >= s && hd <= e && day !== 0 && day !== 6;
                        }).length;
                        return overlaps > 0 ? (
                          <> dan <strong>{overlaps} Hari Libur Nasional</strong> yang terdaftar</>
                        ) : null;
                      })()}.
                    </span>
                  </div>
                </div>
              )}
              
              {canAssign && (
                <div className={styles.formGroup}>
                  <label>Assignees <span style={{ color: '#ef4444' }}>*</span></label>
                  <div className={styles.assigneeChecklistContainer}>
                    {usersList.map((usr) => {
                      const isSelected = formData.assignee_ids && formData.assignee_ids.includes(usr.id.toString());
                      return (
                        <label key={usr.id} className={`${styles.assigneeChecklistItem} ${isSelected ? styles.selected : ''}`}>
                          <span className={styles.assigneeLabel}>{usr.name}</span>
                          <input 
                            type="checkbox" 
                            className={styles.assigneeCheckbox}
                            checked={isSelected}
                            onChange={() => handleAssigneeChange(usr.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>Cancel</button>
                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={hasPendingEdit || (formData.id && inquiries.find(i => i.id === formData.id)?.validation_status === 'pending')}
                  style={(hasPendingEdit || (formData.id && inquiries.find(i => i.id === formData.id)?.validation_status === 'pending')) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInquiry && (
        <div key="view-modal-overlay" className={styles.modalOverlay} onClick={() => setSelectedInquiry(null)}>
          <div className={styles.viewModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.viewModalHeader}>
              <h2 className={styles.modalTitle} style={{ marginBottom: 0 }}>Inquiry Details</h2>
              <button onClick={() => setSelectedInquiry(null)} className={styles.closeIconBtn}>&times;</button>
            </div>
            
            <div className={styles.inquiryCardDetails}>
              <div className={styles.cardHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                  <div className={styles.customerName}>
                    {selectedInquiry.customer_name}
                    {selectedInquiry.validation_status === 'pending' && <span style={{marginLeft: '8px', fontSize: '0.65rem', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold'}}>⏳ Pending</span>}
                    {selectedInquiry.validation_status === 'approved' && !selectedInquiry.product_id && (
                      <span style={{marginLeft: '8px', fontSize: '0.65rem', backgroundColor: '#f0fdfa', color: '#0d9488', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #ccfbf1'}}>
                        ✅ Approved (Belum Ada Produk)
                      </span>
                    )}
                    {selectedInquiry.validation_status === 'approved' && selectedInquiry.product_id && (
                      <span style={{marginLeft: '8px', fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold'}}>
                        ✅ Approved (Sudah Ada Produk)
                      </span>
                    )}
                    {selectedInquiry.validation_status === 'rejected' && <span style={{marginLeft: '8px', fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold'}}>❌ Rejected</span>}
                  </div>
                  <div
                    className={styles.inquiryCode}
                    onClick={() => handleInquiryCodeClick(selectedInquiry.inquiry_code)}
                  >
                    {selectedInquiry.inquiry_code}
                  </div>
                </div>
                {selectedInquiry.validation_status === 'rejected' && selectedInquiry.validation_notes && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic', marginTop: '4px' }}>
                    Alasan Penolakan: {selectedInquiry.validation_notes}
                  </div>
                )}
              </div>

              <div className={styles.cardRequest}>
                {selectedInquiry.customer_request || selectedInquiry.product_name || "No Request Details"}
              </div>
              
              {selectedInquiry.assignees && selectedInquiry.assignees.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px', marginBottom: '8px' }}>
                  {selectedInquiry.assignees.map(assignee => (
                    <div key={assignee.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#1a202c', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                      <FaUser size={10} color="#4a5568"/> <span>{assignee.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.cardImageContainerDetails}>
                {selectedInquiry.images && selectedInquiry.images.length > 0 ? (
                  <div className={styles.imageGallery}>
                    {selectedInquiry.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`Inquiry Image ${idx+1}`} className={styles.cardImageDetails} />
                    ))}
                  </div>
                ) : (
                  <img
                    src='https://via.placeholder.com/300x200?text=No+Image'
                    alt={selectedInquiry.product_name}
                    className={styles.cardImageDetails}
                  />
                )}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.cardTags}>
                  <span className={styles.tagDate}><FaCalendarAlt size={10} /> {formatShortDate(selectedInquiry.request_date)}</span>
                  {Number(selectedInquiry.order_quantity) > 0 && (
                    <span className={styles.tagQuantity}><FaShoppingCart size={10} /> {selectedInquiry.order_quantity}</span>
                  )}
                  {selectedInquiry.product_id ? (
                    <span 
                      onClick={() => handleInquiryCodeClick(selectedInquiry.inquiry_code)}
                      style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 'bold', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: (selectedInquiry.product_status?.toLowerCase() === 'cancelled') ? '#fee2e2' : (selectedInquiry.product_status?.toLowerCase() === 'done' || selectedInquiry.product_status?.toLowerCase() === 'selesai' || selectedInquiry.product_status?.toLowerCase() === 'completed') ? '#22c55e' : selectedInquiry.product_status?.toLowerCase() === 'late' ? '#ef4444' : '#dcfce7', 
                        color: (selectedInquiry.product_status?.toLowerCase() === 'cancelled') ? '#991b1b' : (selectedInquiry.product_status?.toLowerCase() === 'done' || selectedInquiry.product_status?.toLowerCase() === 'selesai' || selectedInquiry.product_status?.toLowerCase() === 'completed') || selectedInquiry.product_status?.toLowerCase() === 'late' ? 'white' : '#166534', 
                        border: '1px solid currentColor', 
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {selectedInquiry.product_status?.toLowerCase() === 'cancelled' ? '🚫 Cancelled' : (selectedInquiry.product_status?.toLowerCase() === 'done' || selectedInquiry.product_status?.toLowerCase() === 'selesai' || selectedInquiry.product_status?.toLowerCase() === 'completed') ? '✅ Complete' : selectedInquiry.product_status?.toLowerCase() === 'late' ? '⚠️ Late' : selectedInquiry.product_status ? `⏳ ${selectedInquiry.product_status}` : '✔ Linked'}
                    </span>
                  ) : (
                    <span 
                      onClick={() => handleInquiryCodeClick(selectedInquiry.inquiry_code)}
                      style={{ fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', cursor: 'pointer' }}
                    >
                      No Product
                    </span>
                  )}
                </div>
                {canAssign && (
                  <div className={styles.cardActions}>
                    <button 
                      className={styles.iconButton} 
                      onClick={() => { setSelectedInquiry(null); handleEdit(selectedInquiry); }} 
                      title="Edit"
                      disabled={selectedInquiry.validation_status === 'pending' || selectedInquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === selectedInquiry.id) || selectedInquiry.product_has_pending_edit || selectedInquiry.product_status?.toLowerCase() === 'cancelled'}
                      style={(selectedInquiry.validation_status === 'pending' || selectedInquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === selectedInquiry.id) || selectedInquiry.product_has_pending_edit || selectedInquiry.product_status?.toLowerCase() === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className={styles.iconButtonDelete} 
                      onClick={() => { setSelectedInquiry(null); handleDelete(selectedInquiry.id); }} 
                      title="Delete"
                      disabled={selectedInquiry.validation_status === 'pending' || selectedInquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === selectedInquiry.id) || selectedInquiry.product_has_pending_edit}
                      style={(selectedInquiry.validation_status === 'pending' || selectedInquiry.validation_status === 'pending_delete' || pendingEdits.some(e => e.target_id === selectedInquiry.id) || selectedInquiry.product_has_pending_edit) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
