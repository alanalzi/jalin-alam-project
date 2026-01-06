"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./product-development.module.css";
import { FaArrowLeft, FaEdit, FaTrash, FaPlus, FaTools } from "react-icons/fa";

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
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [inquiries, setInquiries] = useState([]);
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
    });  const [sortOrder, setSortOrder] = useState('deadline-asc');
  
  // State for the new material input
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

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
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      alert(`Error fetching products: ${String(error.message)}`);
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
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      alert(`Error fetching raw materials: ${String(error.message)}`);
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
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      alert(`Error fetching inquiries: ${String(error.message)}`);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchRawMaterials();
    fetchInquiries();
  }, []);

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
        order_quantity: "",
        requiredMaterials: [],
        images: [],
        type: type,
      });
      setSelectedMaterialId("");
      setSelectedFiles([]);
      setImagePreviews([]);
    }

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
              type: "New Product"
            });    setSelectedMaterialId('');
    setSelectedFiles([]);
    setImagePreviews([]);
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
          order_quantity: selectedInquiry.order_quantity || '',
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
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddMaterial = () => {
    if (!selectedMaterialId) {
      alert("Please select a supplier.");
      return;
    }
    
    const supplierToAdd = rawMaterials.find(m => m.id === parseInt(selectedMaterialId));
    if (!supplierToAdd) {
        alert("Selected supplier not found.");
        return;
    }

    // Check if supplier is already added to this product
    if (formData.requiredMaterials.some(s => s.supplier_id === supplierToAdd.id)) {
        alert("This supplier has already been added to this product.");
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
        }; // payload now includes formData.images (existing images)

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
          } catch (jsonErr) {}
          throw new Error(errorMsg);
        }
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        alert(`Error uploading images: ${String(uploadError.message)}`);
        return; // Stop submission if image upload fails
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
        } catch (jsonErr) {}
          console.error(errorMsg);
          alert(errorMsg);
      } // Corrected: Added missing closing brace for the else block
    } catch (error) {
      console.error("Error submitting product:", error);
      alert(String(error.message));
    }
  };

  const handleEdit = async (product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`);
      if(res.ok) {
        const data = await res.json(); // Fetched product data
        console.log("Debug: data.startDate from API:", data.startDate);

        let inquiryDetails = {};
        if (data.type === 'Custom' && data.inquiry_code) {
          // Find the corresponding inquiry from the already fetched inquiries list
          const relatedInquiry = inquiries.find(inq => inq.inquiry_code === data.inquiry_code);
          if (relatedInquiry) {
            inquiryDetails = {
              customer_request: relatedInquiry.customer_request || '',
              order_quantity: relatedInquiry.order_quantity || '',
            };
          }
        }

        setFormData({
            ...data, // Spread product data
            ...inquiryDetails, // Spread inquiry-specific details if found
            startDate: formatDateForInputValue(data.startDate), // Always use product's startDate
            deadline: formatDateForInputValue(data.deadline),   // Always use product's deadline
            requiredMaterials: (data.requiredMaterials || []).map(material => ({
                supplier_id: material.material_id,
                supplier_name: material.material_name,
            })),
            sku: data.type === 'New Product' ? data.inquiry_code : '',
            inquiry_code: data.type === 'Custom' ? data.inquiry_code : '',
        });
        setSelectedFiles([]);
        setImagePreviews([]);
        openModal(data.type);
      } else {
        let errorMsg = `Failed to fetch product details. Status: ${res.status}`;
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
        console.error("Error in handleEdit:", error);
        alert(String(error.message));
    }
  };

  const handleDelete = async (productId) => {
    console.log("Attempting to delete product with ID:", productId); // Added log
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProducts();
      } else {
        let errorMsg = `Failed to delete. Status: ${res.status}`;
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Error in handleDelete:", err);
      alert(`Error: ${String(err.message)}`);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const [sortField, sortDirection] = sortOrder.split('-');

    let compareA, compareB;

    if (sortField.includes('Date') || sortField === 'deadline') {
      compareA = new Date(a[sortField]);
      compareB = new Date(b[sortField]);

      // Handle invalid dates by treating them as equal or pushing them to one end
      if (isNaN(compareA.getTime())) compareA = sortDirection === 'asc' ? -Infinity : Infinity;
      if (isNaN(compareB.getTime())) compareB = sortDirection === 'asc' ? -Infinity : Infinity;
      
    } else { // For string fields like category, type
      compareA = String(a[sortField]).toLowerCase();
      compareB = String(b[sortField]).toLowerCase();
    }

    if (compareA < compareB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (compareA > compareB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });
  
  return (
    <div className={styles.pageContainer}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Back</span></Link>
      </div>
      <div className={styles.titleContainer}>
        <FaTools className={styles.titleIcon} />
        <h1 className={styles.title}>Product Development</h1>
      </div>
      
      <div className={styles.toolbar}>
        <div className={styles.sortContainer}>
          <label htmlFor="sort-select">Sort by:</label>
          <select id="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={styles.sortSelect}>
            <option value="deadline-asc">Deadline (Soonest First)</option>
            <option value="deadline-desc">Deadline (Latest First)</option>
            <option value="category-asc">Category (A-Z)</option>
            <option value="category-desc">Category (Z-A)</option>
            <option value="type-asc">Type (A-Z)</option>
            <option value="type-desc">Type (Z-A)</option>
            <option value="startDate-asc">Start Date (Earliest First)</option>
            <option value="startDate-desc">Start Date (Latest First)</option>
          </select>
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={() => openModal('New Product', true)} className={styles.addButton}>Add New Product</button>
          <button onClick={() => openModal('Custom', true)} className={`${styles.addButton} ${styles.addCustomButton}`}>Add Custom Order</button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Image</th><th>Product Name</th><th>Code</th><th>Category</th><th>Type</th><th>Start Date</th><th>Deadline</th><th>Progress</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <img 
                      src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/50'} 
                      alt={product.name} 
                      width={50} 
                      height={50} 
                      style={{objectFit: 'cover'}}
                    />
                  </td>
                  <td><Link href={`/product/${product.id}`}>{product.name}</Link></td>
                  <td>{product.inquiry_code}</td>
                  <td>{product.category}</td>
                  <td>{product.type}</td>
                  <td>{formatDateForDisplay(product.startDate)}</td>
                  <td>{formatDateForDisplay(product.deadline)}</td>
                  <td>{product.overall_checklist_percentage}%</td>
                  <td className={styles.actionButtons}>
                    <button onClick={() => handleEdit(product)}><FaEdit /></button>
                    <button onClick={() => handleDelete(product.id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div key="product-modal-overlay" className={styles.modalOverlay}>
          <div key="product-modal-content" className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {formData.id
                ? "Edit Product"
                : productType === 'New Product'
                  ? "Add New Product"
                  : "Custom Order"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}><label>Product Name</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required /></div>

              {productType === 'New Product' && (
                <div className={styles.formGroup}>
                  <label>SKU Code</label>
                  <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required />
                </div>
              )}

              {productType === 'Custom' && (
                <div className={styles.formGroup}>
                  <label>Inquiry Code</label>
                  <select name="inquiry_code" value={formData.inquiry_code} onChange={handleInputChange} required>
                    <option value="">Select Inquiry Code</option>
                    {inquiries.map((inquiry) => (
                      <option key={inquiry.id} value={inquiry.inquiry_code}>
                        {inquiry.inquiry_code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="">Select Category</option>
                  <option value="storage">Storage</option>
                  <option value="decorative">Decorative</option>
                  <option value="table top">Table Top</option>
                </select>
              </div>
              <div className={styles.formGroup}><label>Description</label><textarea name="description" value={formData.description} onChange={handleInputChange}></textarea></div>
              {productType === 'Custom' && (
                <>
                  <div className={styles.formGroup}>
                    <label>Customer Request</label>
                    <textarea name="customer_request" value={formData.customer_request} onChange={handleInputChange}></textarea>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Order Quantity</label>
                    <input type="number" name="order_quantity" value={formData.order_quantity} onChange={handleInputChange} required />
                  </div>
                </>
              )}
              <div className={styles.formGroup}><label>Start Date</label><input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Deadline</label><input type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} required /></div>
              


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
                      {/* You might want a button to remove existing images here if needed */}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <h3>Add New Supplier</h3>
                <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                  <select 
                    value={selectedMaterialId} 
                    onChange={e => setSelectedMaterialId(e.target.value)}
                    style={{flex: 2}}
                  >
                    <option value="">-- Select Supplier --</option>
                    {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button type="button" onClick={handleAddMaterial} className={styles.addButton}><FaPlus/></button>
                </div>
                <ul>
                  {formData.requiredMaterials.map(s => (
                    <li key={s.supplier_id}>
                      {s.supplier_name}
                      <button type="button" onClick={() => handleRemoveMaterial(s.supplier_id)} style={{marginLeft: '10px', color: 'red'}}><FaTrash/></button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>Cancel</button>
                <button type="submit" className={styles.saveButton}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}