"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./product-development.module.css";
import { FaArrowLeft, FaEdit, FaTrash, FaPlus, FaTools, FaTimes, FaList, FaCommentAlt, FaCheck } from "react-icons/fa";
import ProductDetailContent from "./ProductDetailContent";

// Helper function to format date strings for display (DD-MM-YYYY)
function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format date strings for input fields (YYYY-MM-DD)
function formatDateForInputValue(dateString) {
  if (!dateString) return '';
  let date;
  // Handle 'DD-MM-YYYY' format, which might be coming from some parts of the app
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    const parts = dateString.split('-');
    // new Date(year, monthIndex, day)
    date = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    // Default to handling ISO 8601 or other standard formats from the database
    date = new Date(dateString);
  }

  // Check if the created date is valid
  if (isNaN(date.getTime())) {
    return ''; // Return empty if date is not valid
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProductDevelopmentPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    sku: "",
    inquiry_code: "",
    category: "",
    description: "",
    startDate: "",
    deadline: "",
    customer_request: "", // New
    order_quantity: "",     // New
    requiredMaterials: [],
    images: [],
    type: "New Product",
    checklist: [],
    assignee_ids: [],
  }); 
  const [usersList, setUsersList] = useState([]);
  const [sortOrder, setSortOrder] = useState('deadline-asc');
  const [viewMode, setViewMode] = useState('upcoming'); // upcoming | completed | cancelled | rejected
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState('all'); // all, New Product, Custom
  const [originalData, setOriginalData] = useState(null);
  const [hasPendingEdit, setHasPendingEdit] = useState(false); // NEW: For pending indicator
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: To prevent double clicks
  const mounted = useRef(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role?.toLowerCase() === 'admin';
  const isDirektur = session?.user?.role?.toLowerCase() === 'direktur';
  
  // State for the new material input
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) { }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(`Gagal mengambil data produk: ${String(error.message)}`);
      setProducts([]);
    }
  }

  async function fetchRawMaterials() {
    try {
      const res = await fetch('/api/supplier');
      if (res.ok) {
        const data = await res.json();
        setRawMaterials(data);
      } else {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) { }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      toast.error(`Gagal mengambil data supplier: ${String(error.message)}`);
    }
  }

  async function fetchInquiries() {
    try {
      const res = await fetch('/api/inquiries');
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      } else {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) { }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast.error(`Gagal mengambil data inquiry: ${String(error.message)}`);
    }
  }

  async function fetchChecklistTemplates() {
    try {
      const res = await fetch('/api/checklist-templates');
      if (res.ok) {
        setChecklistTemplates(await res.json());
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }

  useEffect(() => {
    console.log("Product Page Loaded. Current Session Role:", session?.user?.role);
    if (mounted.current) return;
    mounted.current = true;
    fetchProducts();
    fetchRawMaterials();
    fetchInquiries();
    fetchChecklistTemplates();

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users/basic');
        if (res.ok && mounted.current) {
          setUsersList(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const addInquiryCode = searchParams.get('addInquiryCode');

    if (action === 'new') {
      openModal('New Product', true);
    } else if (addInquiryCode && inquiries.length > 0) {
      const targetInquiry = inquiries.find(inq => inq.inquiry_code === addInquiryCode);
      if (targetInquiry) {
        openModal('Custom', true);
        setFormData(prev => ({
          ...prev,
          inquiry_code: targetInquiry.inquiry_code,
          name: targetInquiry.product_name || '',
          description: targetInquiry.product_description || '',
          startDate: formatDateForInputValue(targetInquiry.request_date) || '',
          deadline: formatDateForInputValue(targetInquiry.image_deadline) || '',
          images: targetInquiry.images || [],
          customer_request: targetInquiry.customer_request || '',
          order_quantity: targetInquiry.order_quantity ? String(targetInquiry.order_quantity) : '',
          assignee_ids: targetInquiry.assignees ? targetInquiry.assignees.map(a => a.id.toString()) : [],
        }));
      }
    }
  }, [searchParams, inquiries]);

  const [productType, setProductType] = useState('New Product');

  const openModal = (type = 'New Product', isNew = false) => {
    setProductType(type);

    if (isNew) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;

      setFormData({
        id: null,
        name: "",
        sku: "",
        inquiry_code: "",
        category: "",
        description: "",
        startDate: type === "New Product" ? currentDate : "",
        deadline: "",
        customer_request: "",
        order_quantity: "1",
        requiredMaterials: [],
        images: [],
        type: type,
        checklist: [],
        assignee_ids: [],
      });
      setSelectedMaterialId("");
      setSelectedTemplateId("");
      setSelectedFiles([]);
      setImagePreviews([]);
    }
    setHasPendingEdit(false);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      id: null,
      name: "",
      sku: "",
      inquiry_code: "",
      category: "",
      description: "",
      startDate: "",
      deadline: "",
      customer_request: "",
      order_quantity: "",
      requiredMaterials: [],
      images: [],
      type: "New Product",
      assignee_ids: []
    }); setSelectedMaterialId('');
    setSelectedFiles([]);
    setImagePreviews([]);
    setHasPendingEdit(false);
  };

  const handleAssigneeChange = (userId) => {
    setFormData(prev => {
      const strId = String(userId);
      const currentIds = Array.isArray(prev.assignee_ids) ? prev.assignee_ids : [];
      const isSelected = currentIds.includes(strId);
      if (isSelected) {
        return { ...prev, assignee_ids: currentIds.filter(id => id !== strId) };
      } else {
        return { ...prev, assignee_ids: [...currentIds, strId] };
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'inquiry_code') {
      const selectedInquiry = inquiries.find(inq => inq.inquiry_code === value);

      if (selectedInquiry) {
        setFormData(prev => ({
          ...prev,
          inquiry_code: value,
          name: selectedInquiry.product_name || '',
          description: selectedInquiry.product_description || '',
          startDate: formatDateForInputValue(selectedInquiry.request_date) || '',
          deadline: formatDateForInputValue(selectedInquiry.image_deadline) || '',
          images: selectedInquiry.images || [],
          customer_request: selectedInquiry.customer_request || '',
          order_quantity: selectedInquiry.order_quantity ?? '',
          assignee_ids: selectedInquiry.assignees ? selectedInquiry.assignees.map(a => a.id.toString()) : [],
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          inquiry_code: '',
          name: '',
          description: '',
          startDate: '',
          deadline: '',
          images: [],
          customer_request: '',
          order_quantity: '',
          assignee_ids: [],
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddMaterial = () => {
    if (!selectedMaterialId) {
      toast.error("Silakan pilih supplier terlebih dahulu.");
      return;
    }

    const supplierToAdd = rawMaterials.find(m => m.id === parseInt(selectedMaterialId));
    if (!supplierToAdd) {
      toast.error("Supplier yang dipilih tidak ditemukan.");
      return;
    }

    // Check if supplier is already added to this product
    if (formData.requiredMaterials.some(s => s.supplier_id === supplierToAdd.id)) {
      toast.error("Supplier ini sudah ditambahkan ke produk ini.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      requiredMaterials: [
        ...prev.requiredMaterials,
        {
          supplier_id: supplierToAdd.id,
          supplier_name: supplierToAdd.name,
        }
      ]
    }));
    setSelectedMaterialId(''); // Clear selection
  };

  const handleRemoveMaterial = (supplierId) => {
    setFormData(prev => ({
      ...prev,
      requiredMaterials: prev.requiredMaterials.filter(s => s.supplier_id !== supplierId)
    }));
  };



  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const fileReaders = [];
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
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (productType === 'Custom' && formData.inquiry_code) {
      const selectedInquiry = inquiries.find(inq => inq.inquiry_code === formData.inquiry_code);
      if (selectedInquiry && selectedInquiry.validation_status !== 'approved') {
        toast.error("Gagal menyimpan: Inquiry ini belum di-ACC oleh Direktur.");
        return;
      }
      if (selectedInquiry && selectedInquiry.has_pending_edit) {
        toast.error("Gagal menyimpan: Inquiry ini sedang dalam proses edit oleh Direktur. Harap tunggu validasi selesai.");
        return;
      }
    }

    const url = formData.id ? `/api/products/${formData.id}` : '/api/products';
    const method = formData.id ? 'PUT' : 'POST';
    const payload = {
      id: formData.id,
      name: formData.name || '',
      inquiry_code: productType === 'New Product' ? formData.sku || '' : formData.inquiry_code || '',
      category: formData.category || '',
      description: formData.description || '',
      startDate: formData.startDate || '',
      deadline: formData.deadline || '',
      requiredMaterials: formData.requiredMaterials,
      images: formData.images,
      type: formData.type,
      custom_attributes: formData.custom_attributes || [],
      checklist: formData.checklist || [],
      assignee_ids: formData.assignee_ids || [],
      order_quantity: parseInt(formData.order_quantity) || 0,
      customer_request: formData.customer_request || '',
      status: formData.status || 'ongoing',
    }; // payload now includes all fields

    if (payload.order_quantity < 0) {
      toast.error("Order Quantity tidak boleh kurang dari nol!");
      return;
    }

    if (payload.startDate && payload.deadline) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.deadline);
      if (end < start) {
        toast.error("Deadline tidak boleh sebelum Start Date!");
        setIsSubmitting(false);
        return;
      }
    }

    // Upload new files if selected
    if (selectedFiles.length > 0) {
      const uploadFormData = new FormData();
      selectedFiles.forEach(file => {
        uploadFormData.append('images', file);
      });

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData, // No 'Content-Type' header here, browser sets it for FormData
        });

        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          payload.images = [...(payload.images || []), ...urls]; // Add new URLs to existing ones
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
        toast.error(`Gagal mengunggah gambar: ${String(uploadError.message)}`);
        setIsSubmitting(false);
        return; // Stop submission if image upload fails
      }
    }

    console.log("Debug Submission:", { isAdmin, hasId: formData.id, role: session?.user?.role });

    // Redirect to Edit Requests if Admin is editing existing product
    if (isAdmin && formData.id) {
      let hasChanges = false;
      const fields = ['name', 'category', 'description', 'startDate', 'deadline', 'type', 'order_quantity', 'status', 'customer_request'];
      for (const field of fields) {
        let oldVal = originalData[field];
        if (field === 'startDate' || field === 'deadline') {
          oldVal = formatDateForInputValue(oldVal);
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
      
      if (!hasChanges) {
        const oldTasks = (originalData.checklist || []).map(t => (t.task_name || t.task).trim()).sort().join(',');
        const newTasks = (payload.checklist || []).map(t => (t.task_name || t.task).trim()).sort().join(',');
        if (oldTasks !== newTasks) hasChanges = true;
      }
      
      if (!hasChanges) {
        const oldMats = (originalData.requiredMaterials || []).map(m => String(m.material_id || m.supplier_id)).sort().join(',');
        const newMats = (payload.requiredMaterials || []).map(m => String(m.supplier_id)).sort().join(',');
        if (oldMats !== newMats) hasChanges = true;
      }
      
      if (!hasChanges && selectedFiles.length > 0) {
        hasChanges = true;
      }

      if (!hasChanges) {
        toast("Tidak ada perubahan yang dilakukan.", { icon: 'ℹ️' });
        closeModal();
        setIsSubmitting(false);
        return;
      }

      console.log("Redirecting to Edit Request API...");
      try {
        const res = await fetch('/api/edit-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_type: 'product',
            target_id: formData.id,
            old_data: originalData,
            new_data: payload
          }),
        });

        if (res.ok) {
          toast.success("Perubahan telah diajukan ke Direktur untuk divalidasi.");
          closeModal();
          setIsSubmitting(false);
          return;
        } else {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengajukan perubahan.");
        }
      } catch (err) {
        toast.error(err.message);
        setIsSubmitting(false);
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
        await fetchProducts();
        closeModal();
      } else {
        let errorMsg = `Failed to save product. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonErr) { }
        console.error(errorMsg);
        toast.error(errorMsg);
      } // Corrected: Added missing closing brace for the else block
    } catch (error) {
      console.error("Error submitting product:", error);
      toast.error(String(error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (product) => {
    try {
      // Check for pending edits first
      let hasPending = false;
      const checkRes = await fetch(`/api/edit-requests?targetId=${product.id}&targetType=product&status=pending`);
      if (checkRes.ok) {
        const pending = await checkRes.json();
        if (pending.length > 0) hasPending = true;
      }
      
      // Also check if its linked inquiry has a pending edit
      if (product.type === 'Custom' && product.inquiry_code) {
        const relatedInquiry = inquiries.find(inq => inq.inquiry_code === product.inquiry_code);
        if (relatedInquiry) {
          const checkInqRes = await fetch(`/api/edit-requests?targetId=${relatedInquiry.id}&targetType=inquiry&status=pending`);
          if (checkInqRes.ok) {
            const pendingInq = await checkInqRes.json();
            if (pendingInq.length > 0) hasPending = true;
          }
        }
      }
      setHasPendingEdit(hasPending);

      const res = await fetch(`/api/products/${product.id}`);
      if (res.ok) {
        const data = await res.json(); // Fetched product data
        console.log("Debug: data.startDate from API:", data.startDate);

        let inquiryDetails = {};
        if (data.type === 'Custom' && data.inquiry_code) {
          const relatedInquiry = inquiries.find(inq => inq.inquiry_code === data.inquiry_code);
          if (relatedInquiry) {
            inquiryDetails = {
              customer_request: relatedInquiry.customer_request || data.customer_request || '',
              order_quantity: String(relatedInquiry.order_quantity || data.order_quantity || ''),
            };
          }
        }

        // Ensure order_quantity is a string for the input field
        const finalOrderQuantity = inquiryDetails.order_quantity || String(data.order_quantity || '');

        setFormData({
          ...data,
          category: data.category || '',
          description: data.description || '',
          inquiry_code: data.type === 'Custom' ? (data.inquiry_code || '') : '',
          sku: data.type === 'New Product' ? (data.inquiry_code || '') : '',
          order_quantity: finalOrderQuantity,
          customer_request: inquiryDetails.customer_request || data.customer_request || '',
          startDate: formatDateForInputValue(data.startDate), // Always use product's startDate
          deadline: formatDateForInputValue(data.deadline),   // Always use product's deadline
          requiredMaterials: (data.requiredMaterials || []).map(material => ({
            supplier_id: material.material_id,
            supplier_name: material.material_name,
          })),
          custom_attributes: data.custom_attributes || [],
          assignee_ids: data.assignees ? data.assignees.map(a => String(a.id)) : [],
        });
        setOriginalData(data);
        setSelectedFiles([]);
        setImagePreviews([]);
        openModal(data.type);
      } else {
        let errorMsg = `Failed to fetch product details. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error in handleEdit:", error);
      toast.error(String(error.message));
    }
  };

  const handleDelete = async (productId) => {
    console.log("Attempting to delete product with ID:", productId);
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          toast.success(data.message);
        }
        await fetchProducts();
      } else {
        let errorMsg = `Failed to delete. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Error in handleDelete:", err);
      toast.error(`Kesalahan: ${String(err.message)}`);
    }
  };

  const getFilteredProducts = () => {
    let filtered = products.filter(p => {
      const isRejected = p.validation_status === 'rejected';
      const isCancelled = p.status?.toLowerCase() === 'cancelled';
      const isCompleted = p.status?.toLowerCase() === 'completed' || p.status === 'Selesai' || p.status === 'Done' || p.status?.toLowerCase() === 'late done';
      
      // Calculate derived status
      let derivedStatus = p.status || 'Ongoing';
      if (isCancelled) {
        derivedStatus = 'Cancelled';
      } else if (isCompleted) {
        const deadlineDate = p.deadline ? new Date(p.deadline) : null;
        const completionDate = p.completed_at ? new Date(p.completed_at) : null;
        if (deadlineDate && completionDate) {
           deadlineDate.setHours(0,0,0,0);
           completionDate.setHours(0,0,0,0);
           derivedStatus = completionDate > deadlineDate ? 'Late Done' : 'Completed';
        } else {
           derivedStatus = 'Completed';
        }
      } else if (!isRejected) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = p.deadline ? new Date(p.deadline) : null;
        if (deadlineDate) {
          deadlineDate.setHours(0, 0, 0, 0);
          if (deadlineDate < today) derivedStatus = 'Late';
          else derivedStatus = 'Ongoing';
        }
      }

      const is100Percent = Number(p.overallChecklistPercentage) === 100;
      
      let matchesView = false;
      if (viewMode === 'rejected') {
        matchesView = isRejected;
      } else if (viewMode === 'completed') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const completionDate = p.completed_at ? new Date(p.completed_at) : null;
        const isRecentlyFinished = isCompleted && completionDate && completionDate >= oneMonthAgo;
        
        matchesView = !isRejected && (isRecentlyFinished || is100Percent);
      } else if (viewMode === 'cancelled') {
        matchesView = isCancelled;
      } else {
        // upcoming
        matchesView = !isRejected && !isCompleted && !isCancelled && !is100Percent && derivedStatus !== 'Late Done';
      }
      
      const matchesSearch = 
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.inquiry_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
      const matchesFilter = filterType === 'all' || p.type === filterType;
        
      return matchesView && matchesSearch && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      const [sortField, sortDirection] = sortOrder.split('-');

      let compareA, compareB;

      if (sortField.includes('Date') || sortField === 'deadline' || sortField === 'created_at') {
        compareA = new Date(a[sortField]);
        compareB = new Date(b[sortField]);
        if (isNaN(compareA.getTime())) compareA = sortDirection === 'asc' ? -Infinity : Infinity;
        if (isNaN(compareB.getTime())) compareB = sortDirection === 'asc' ? -Infinity : Infinity;
      } else if (sortField === 'overallChecklistPercentage') {
        compareA = Number(a[sortField] || 0);
        compareB = Number(b[sortField] || 0);
      } else {
        compareA = String(a[sortField] || '').toLowerCase();
        compareB = String(b[sortField] || '').toLowerCase();
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const displayProducts = getFilteredProducts();

  return (
    <div className={styles.pageContainer} translate="no">
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Back to Dashboard</span></Link>
      </div>
      <div className={styles.titleContainer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaTools className={styles.titleIcon} />
          <h1 className={styles.title} style={{ marginBottom: 0 }}>Product Development</h1>
        </div>
        
        {/* TABBED INTERFACE */}
        <div className={styles.tabGroup}>
          <button 
            onClick={() => setViewMode('upcoming')} 
            className={`${styles.tabBtn} ${viewMode === 'upcoming' ? styles.activeTab : ''}`}
          >
            Upcoming Deadlines
          </button>
          <button 
            onClick={() => setViewMode('completed')} 
            className={`${styles.tabBtn} ${viewMode === 'completed' ? styles.activeTab : ''}`}
          >
            Recently Completed (1 Month)
          </button>
          <button 
            onClick={() => setViewMode('cancelled')} 
            className={`${styles.tabBtn} ${viewMode === 'cancelled' ? styles.activeTab : ''}`}
          >
            Cancelled
          </button>
          <button 
            onClick={() => setViewMode('rejected')} 
            className={`${styles.tabBtn} ${viewMode === 'rejected' ? styles.activeTab : ''}`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolsLeft}>
          <div className={styles.toolItem}>
            <span className={styles.toolLabel}>Sort by:</span>
            <select id="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={styles.sortSelect}>
              <option value="deadline-asc">Deadline (Terdekat)</option>
              <option value="deadline-desc">Deadline (Terjauh)</option>
              <option value="created_at-desc">Baru Ditambahkan (Terbaru)</option>
              <option value="created_at-asc">Baru Ditambahkan (Terlama)</option>
              <option value="overallChecklistPercentage-desc">Progres (Tertinggi)</option>
              <option value="overallChecklistPercentage-asc">Progres (Terendah)</option>
              <option value="name-asc">Nama Produk (A-Z)</option>
              <option value="name-desc">Nama Produk (Z-A)</option>
            </select>
          </div>

          <div className={styles.toolItem}>
            <span className={styles.toolLabel}>Filter Type:</span>
            <select
              className={styles.sortSelect}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="New Product">New Product</option>
              <option value="Custom">Custom Order</option>
            </select>
          </div>
        </div>

        <div className={styles.searchWrapper}>
           <input 
             type="text" 
             placeholder="Search product name or code..." 
             className={styles.searchInput}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>

        {(isAdmin || isDirektur) && (
          <div className={styles.buttonGroup}>
            <button onClick={() => openModal('New Product', true)} className={styles.addButton}>Add New Product</button>
            <button onClick={() => openModal('Custom', true)} className={`${styles.addButton} ${styles.addCustomButton}`}>Add Custom Order</button>
          </div>
        )}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Image</th><th>Product Name</th><th>Code</th><th>Deadline</th><th>Progress</th>
              {(isAdmin || isDirektur) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayProducts.map((product) => (
              <tr 
                key={product.id} 
                className={styles.clickableRow}
                onClick={() => router.push(`/product/${product.id}`)}
              >
                <td>
                  <img
                    src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/50'}
                    alt={product.name}
                    width={50}
                    height={50}
                    style={{ objectFit: 'cover' }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link 
                        href={`/product/${product.id}`}
                        className={styles.productNameButton}
                      >
                        {product.name}
                      </Link>
                      {product.created_at && (new Date() - new Date(product.created_at) < 24 * 60 * 60 * 1000) && (
                        <span style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontSize: '0.6rem',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                        }}>Baru</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.65rem', 
                        backgroundColor: product.type === 'Custom' ? '#fdf4ff' : '#eff6ff', 
                        color: product.type === 'Custom' ? '#a21caf' : '#2563eb', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontWeight: '700',
                        border: `1px solid ${product.type === 'Custom' ? '#f5d0fe' : '#bfdbfe'}`,
                        letterSpacing: '0.02em'
                      }}>
                        {product.type === 'Custom' ? 'Custom Order' : 'New Product'}
                      </span>
                      {product.type === 'Custom' && product.inquiry_validation_status === 'approved' && (
                        <span style={{
                          fontSize: '0.6rem',
                          backgroundColor: '#f0fdf4',
                          color: '#166534',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          border: '1px solid #bbf7d0',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <FaCheck size={8} /> Inquiry ACC
                        </span>
                      )}
                      {product.validation_status === 'pending' && <span style={{fontSize: '0.65rem', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>⏳ Pending</span>}
                      {product.validation_status === 'approved' && <span style={{fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>✅ Approved</span>}
                      {product.validation_status === 'rejected' && <span style={{fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>❌ Rejected</span>}
                      {product.validation_status === 'pending_delete' && <span style={{fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>🗑️ Menunggu Hapus</span>}
                      {product.status?.toLowerCase() === 'late done' && (
                        <span style={{fontSize: '0.65rem', backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #ffedd5'}}>
                          ⚠️ Late Done
                        </span>
                      )}
                      {(() => {
                        const hasPending = !!(products.some(p => p.id === product.id && p.has_pending_edit) || product.inquiry_has_pending_edit);
                        return hasPending && (
                          <span style={{ 
                            fontSize: "0.6rem", 
                            backgroundColor: "#eff6ff", 
                            color: "#2563eb", 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            fontWeight: "800", 
                            border: "1px solid #bfdbfe", 
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            ⚙️ Edit Pending
                          </span>
                        );
                      })()}

                      {product.status === 'cancelled' && (
                        <span style={{
                          fontSize: "0.6rem",
                          backgroundColor: "#fef2f2",
                          color: "#991b1b",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "800",
                          border: "1px solid #fecaca",
                          textTransform: "uppercase",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginLeft: "4px"
                        }}>
                          🚫 Cancelled
                        </span>
                      )}
                    </div>
                      {/* Catatan dari Tahap Inquiry */}
                      {product.type === 'Custom' && product.inquiry_validation_notes && (
                        <div style={{ 
                          fontSize: "0.75rem", 
                          color: "#166534", 
                          marginTop: "8px", 
                          display: "flex", 
                          flexDirection: "column",
                          gap: "4px",
                          backgroundColor: "#f0fdf4", 
                          padding: "8px 12px", 
                          borderRadius: "8px", 
                          borderLeft: "4px solid #10b981",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <FaCommentAlt size={10} /> Catatan dari Tahap Inquiry
                          </div>
                          <div style={{ fontStyle: "italic", lineHeight: "1.4" }}>
                            &quot;{product.inquiry_validation_notes}&quot;
                          </div>
                        </div>
                      )}

                      {/* Catatan dari Tahap Pengembangan Produk */}
                      {product.validation_notes && (
                        <div style={{ 
                          fontSize: "0.75rem", 
                          color: product.validation_status === 'rejected' ? "#991b1b" : "#1e40af", 
                          marginTop: "8px", 
                          display: "flex", 
                          flexDirection: "column",
                          gap: "4px",
                          backgroundColor: product.validation_status === 'rejected' ? "#fef2f2" : "#eff6ff", 
                          padding: "8px 12px", 
                          borderRadius: "8px", 
                          borderLeft: "4px solid " + (product.validation_status === "rejected" ? "#ef4444" : "#3b82f6"),
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <FaCommentAlt size={10} /> {product.validation_status === 'rejected' ? "Alasan Penolakan" : "Catatan Direktur (Produk)"}
                          </div>
                          <div style={{ fontStyle: "italic", lineHeight: "1.4" }}>
                            &quot;{product.validation_notes}&quot;
                          </div>
                        </div>
                      )}
                  </div>
                </td>
                <td>
                  <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', color: '#475569', fontWeight: 'bold' }}>
                    {product.inquiry_code}
                  </code>
                </td>
                <td>{formatDateForDisplay(product.deadline)}</td>
                <td>{product.overallChecklistPercentage}%</td>
                {(isAdmin || isDirektur) && (
                  <td className={styles.actionButtons}>
                    <div className={styles.actionGroup}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                        disabled={product.validation_status === 'pending' || product.validation_status === 'pending_delete' || products.some(p => p.id === product.id && p.has_pending_edit) || product.inquiry_has_pending_edit || product.status === 'cancelled'}
                        style={(product.validation_status === 'pending' || product.validation_status === 'pending_delete' || products.some(p => p.id === product.id && p.has_pending_edit) || product.inquiry_has_pending_edit || product.status === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                        disabled={product.validation_status === 'pending' || product.validation_status === 'pending_delete' || products.some(p => p.id === product.id && p.has_pending_edit) || product.inquiry_has_pending_edit || product.status === 'cancelled'}
                        style={(product.validation_status === 'pending' || product.validation_status === 'pending_delete' || products.some(p => p.id === product.id && p.has_pending_edit) || product.inquiry_has_pending_edit || product.status === 'cancelled') ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="modal-portal-root">
        {isModalOpen && (
          <div key="product-modal-overlay" className={styles.modalOverlay}>
            <div key="product-modal-content" className={styles.modalContent}>
              <h2 className={styles.modalTitle}>
                {formData.id ? `Edit Product: ${formData.name || formData.id}` : `Add ${productType}`}
              </h2>
              
              {productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.validation_status !== 'approved' && (
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
                  <FaTimes />
                  <span>Produk Custom hanya bisa dibuat jika Inquiry sudah di-ACC oleh Direktur.</span>
                </div>
              )}

              {productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.has_pending_edit && (
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #3b82f6', 
                  color: '#1e40af', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  marginBottom: '1rem', 
                  fontSize: '0.85rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem' 
                }}>
                  <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold' }}>PENDING</div>
                  <span>Inquiry ini sedang dalam proses validasi edit oleh Direktur. Harap tunggu sampai selesai sebelum membuat produk.</span>
                </div>
              )}
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
                    <span style={{ fontSize: '0.85rem' }}>Produk ini sedang dalam proses validasi edit oleh Direktur.</span>
                  </div>
                )}
                <div className={styles.formGroup}><label>Product Name</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required /></div>

                {productType === 'New Product' && (
                  <div className={styles.formGroup}>
                    <label>SKU Code</label>
                    {formData.id ? (
                      <input 
                        type="text" 
                        value={formData.sku} 
                        disabled 
                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} 
                      />
                    ) : (
                      <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required />
                    )}
                  </div>
                )}

                {productType === 'Custom' && (
                  <div className={styles.formGroup}>
                    <label>Inquiry Code</label>
                    {formData.id ? (
                      <input 
                        type="text" 
                        value={formData.inquiry_code} 
                        disabled 
                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} 
                      />
                    ) : (
                      <select name="inquiry_code" value={formData.inquiry_code || ""} onChange={handleInputChange} required>
                        <option value="">Select Inquiry Code</option>
                        {inquiries.map((inquiry) => (
                          <option 
                            key={inquiry.id} 
                            value={inquiry.inquiry_code}
                            disabled={inquiry.validation_status === 'pending' || inquiry.validation_status === 'rejected' || inquiry.has_pending_edit}
                          >
                            {inquiry.inquiry_code} - {inquiry.customer_name} ({inquiry.product_name || 'Tanpa Nama Produk'}) 
                            {inquiry.validation_status === 'pending' ? ' (Menunggu Approval)' : inquiry.validation_status === 'rejected' ? ' (Ditolak)' : inquiry.has_pending_edit ? ' (Edit Pending)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select name="category" value={formData.category || ""} onChange={handleInputChange} required>
                    <option value="">Select Category</option>
                    <option value="storage">Storage</option>
                    <option value="decorative">Decorative</option>
                    <option value="table top">Table Top</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className={styles.formGroup}><label>Description</label><textarea name="description" value={formData.description || ""} onChange={handleInputChange}></textarea></div>
                {productType === 'Custom' && (
                  <div className={styles.formGroup}>
                    <label>Customer Request</label>
                    <textarea name="customer_request" value={formData.customer_request} onChange={handleInputChange}></textarea>
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Order Quantity</label>
                  <input 
                    type="number" 
                    name="order_quantity" 
                    value={formData.order_quantity || "1"} 
                    onChange={handleInputChange} 
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
                <div className={styles.formGroup}><label>Start Date</label><input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} min={formData.id ? undefined : new Date().toISOString().split('T')[0]} required /></div>
                <div className={styles.formGroup}>
                  <label>Deadline</label>
                  <input 
                    type="date" 
                    name="deadline" 
                    value={formData.deadline} 
                    onChange={handleInputChange} 
                    min={formData.startDate}
                    required 
                  />
                </div>



                <div className={styles.formGroup}>
                  <label>Product Images</label>
                  <input
                    type="file"
                    name="images"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
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

                <div className={styles.formGroup}>
                  <h3>Tambah Supplier Baru</h3>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <select
                      value={selectedMaterialId}
                      onChange={e => setSelectedMaterialId(e.target.value)}
                      style={{ flex: 2 }}
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddMaterial} className={styles.addButton}><FaPlus /></button>
                  </div>
                  <div className={styles.modernListContainer}>
                    {formData.requiredMaterials.map(s => (
                      <div key={s.supplier_id} className={styles.modernListItem}>
                        <span className={styles.modernListItemText}>{s.supplier_name}</span>
                        <button type="button" onClick={() => handleRemoveMaterial(s.supplier_id)} className={styles.modernListDeleteBtn}><FaTrash /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <h3>Checklist</h3>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <select
                      value={selectedTemplateId}
                      onChange={e => {
                        const templateId = e.target.value;
                        setSelectedTemplateId(templateId);
                        if (templateId) {
                          const template = checklistTemplates.find(t => t.id === parseInt(templateId));
                          if (template) {
                            const existingTaskNames = (formData.checklist || []).map(t => (t.task_name || t.task || '').trim().toLowerCase());
                            const newTasks = template.tasks
                              .filter(t => !existingTaskNames.includes((t.task_name || t.task || '').trim().toLowerCase()))
                              .map(t => ({ 
                                task_name: t.task_name || t.task,
                                percentage: 0 
                              }));
                            
                            if (newTasks.length === 0 && template.tasks.length > 0) {
                              toast.error("Semua rincian tugas dari template ini sudah ada di dalam daftar.");
                              return;
                            }

                            if (newTasks.length < template.tasks.length) {
                              toast.success(`${template.tasks.length - newTasks.length} tugas yang sudah ada dilewati agar tidak duplikat.`);
                            }

                            setFormData(prev => ({
                              ...prev,
                              checklist: [...(prev.checklist || []), ...newTasks]
                            }));
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Load from Template --</option>
                      {checklistTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button type="button" onClick={() => {
                      const taskName = prompt("Enter manual task name:");
                      if (taskName) {
                        setFormData(prev => ({ ...prev, checklist: [...prev.checklist, { task_name: taskName }] }));
                      }
                    }} className={styles.addButton}><FaPlus /> Manual Task</button>
                  </div>
                  <div className={styles.modernListContainer}>
                    {formData.checklist && formData.checklist.map((task, index) => (
                      <div key={index} className={styles.modernListItem}>
                        <span className={styles.modernListItemText}>{index + 1}. {task.task_name || task.task}</span>
                        <button type="button" onClick={() => {
                          const newChecklist = [...formData.checklist];
                          newChecklist.splice(index, 1);
                          setFormData(prev => ({ ...prev, checklist: newChecklist }));
                        }} className={styles.modernListDeleteBtn}><FaTrash size={12} /></button>
                      </div>
                    ))}
                    {(!formData.checklist || formData.checklist.length === 0) && (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No checklist items added yet.</p>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project Assignees</label>
                  <div className={styles.assigneeChecklistContainer}>
                    {usersList.map((usr) => {
                      const isSelected = Array.isArray(formData.assignee_ids) && formData.assignee_ids.includes(String(usr.id));
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

                <div className={styles.modalActions}>
                  <button type="button" onClick={closeModal} className={styles.cancelButton}>Cancel</button>
                  <button 
                    type="submit" 
                    className={styles.saveButton}
                    disabled={
                      isSubmitting ||
                      (productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.validation_status !== 'approved') ||
                      (productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.has_pending_edit) ||
                      hasPendingEdit || 
                      (formData.id && products.find(p => p.id === formData.id)?.validation_status === 'pending') ||
                      (formData.id && products.find(p => p.id === formData.id)?.validation_status === 'pending_delete')
                    }
                    style={
                      (isSubmitting ||
                      (productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.validation_status !== 'approved') ||
                      (productType === 'Custom' && formData.inquiry_code && inquiries.find(inq => inq.inquiry_code === formData.inquiry_code)?.has_pending_edit) ||
                      hasPendingEdit || 
                      (formData.id && products.find(p => p.id === formData.id)?.validation_status === 'pending') ||
                      (formData.id && products.find(p => p.id === formData.id)?.validation_status === 'pending_delete'))
                        ? { opacity: 0.5, cursor: 'not-allowed' } : {}
                    }
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}