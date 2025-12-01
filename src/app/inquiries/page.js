// jalin-alam/src/app/inquiries/page.js
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./inquiries.module.css";
import { FaArrowLeft, FaEdit, FaTrash, FaPlus } from "react-icons/fa";

function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function InquiryManagementPage() {
  const [inquiries, setInquiries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
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
    images: []
  });

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
      setInquiries([]);
    }
  }

  useEffect(() => {
    fetchInquiries();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
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
      order_quantity: ""
    });
    setSelectedFiles([]);
    setImagePreviews([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    const url = formData.id ? `/api/inquiries/${formData.id}` : '/api/inquiries';
    const method = formData.id ? 'PUT' : 'POST';
    const payload = { ...formData }; // Start with all form data

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
        body: JSON.stringify(payload), // Send the updated payload
      });

      if (res.ok) {
        await fetchInquiries();
        closeModal();
      } else {
        let errorMsg = `Failed to save inquiry. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonErr) {}
        console.error(errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      alert(String(error.message));
    }
  };

  const handleEdit = async (inquiry) => {
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`);
      if(res.ok) {
        const data = await res.json();
        setFormData({
            ...data,
            request_date: formatDateForInput(data.request_date),
            image_deadline: formatDateForInput(data.image_deadline),
            inquiry_code: data.inquiry_code || '',
            customer_name: data.customer_name || '',
            customer_email: data.customer_email || '',
            customer_phone: data.customer_phone || '',
            customer_address: data.customer_address || '',
            order_quantity: data.order_quantity.toString(),
            images: data.images || [], // Populate existing images
        });
        setSelectedFiles([]); // Reset selected files
        setImagePreviews([]); // Reset image previews
        openModal();
      } else {
        let errorMsg = `Failed to fetch inquiry details. Status: ${res.status}`;
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

  const handleDelete = async (inquiryId) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchInquiries();
      } else {
        let errorMsg = `Failed to delete inquiry. Status: ${res.status}`;
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
  
  return (
    <div className={styles.pageContainer}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Back</span></Link>
      </div>
      <h1 className={styles.title}>Inquiry Management</h1>
      
      <div className={styles.toolbar}>
        <button onClick={() => { 
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
            order_quantity: ""
          }); 
          openModal(); 
        }} className={styles.addButton}>Add Inquiry</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.inquiryTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Inquiry Code</th>
              <th>Customer Name</th>
              <th>Customer Email</th>
              <th>Customer Phone</th>
              <th>Customer Address</th>
              <th>Product Name</th>
              <th>Request</th>
              <th>Request Date</th>
              <th>Image Deadline</th>
              <th>Order Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>
                    <img 
                      src={inquiry.images && inquiry.images.length > 0 ? inquiry.images[0] : 'https://via.placeholder.com/50'} 
                      alt={inquiry.product_name} 
                      width={50} 
                      height={50} 
                      style={{objectFit: 'cover'}}
                    />
                  </td>
                  <td>{inquiry.inquiry_code}</td>
                  <td>{inquiry.customer_name}</td>
                  <td>{inquiry.customer_email}</td>
                  <td>{inquiry.customer_phone}</td>
                  <td>{inquiry.customer_address}</td>
                  <td>{inquiry.product_name}</td>
                  <td>{inquiry.customer_request}</td>
                  <td>{formatDateForInput(inquiry.request_date)}</td>
                  <td>{formatDateForInput(inquiry.image_deadline)}</td>
                  <td>{inquiry.order_quantity}</td>
                  <td className={styles.actionButtons}>
                    <button onClick={() => handleEdit(inquiry)}><FaEdit /></button>
                    <button onClick={() => handleDelete(inquiry.id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div key="inquiry-modal-overlay" className={styles.modalOverlay}>
          <div key="inquiry-modal-content" className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{formData.id ? "Edit Inquiry" : "Add New Inquiry"}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Inquiry Code</label>
                <input
                  type="text"
                  name="inquiry_code"
                  value={formData.inquiry_code}
                  onChange={handleInputChange}
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div className={styles.formGroup}><label>Customer Name</label><input type="text" name="customer_name" value={formData.customer_name} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Customer Email</label><input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} /></div>
              <div className={styles.formGroup}><label>Customer Phone</label><input type="text" name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} /></div>
              <div className={styles.formGroup}><label>Customer Address</label><textarea name="customer_address" value={formData.customer_address} onChange={handleInputChange}></textarea></div>

              <div className={styles.formGroup}>
                <label>Inquiry Images</label>
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
                      {/* Add a button to remove existing images if needed */}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}><label>Product Name</label><input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Product Description</label><textarea name="product_description" value={formData.product_description} onChange={handleInputChange}></textarea></div>
              <div className={styles.formGroup}><label>Customer Request</label><textarea name="customer_request" value={formData.customer_request} onChange={handleInputChange}></textarea></div>
              <div className={styles.formGroup}><label>Request Date</label><input type="date" name="request_date" value={formData.request_date} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Image Deadline</label><input type="date" name="image_deadline" value={formData.image_deadline} onChange={handleInputChange} /></div>
              <div className={styles.formGroup}><label>Order Quantity</label><input type="number" name="order_quantity" value={formData.order_quantity} onChange={handleInputChange} required /></div>
              
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
