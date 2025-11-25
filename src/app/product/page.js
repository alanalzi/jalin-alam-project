"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./product-development.module.css";
import { FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";

// Helper to sanitize image paths received from the server
function sanitizeImagePath(path) {
  if (typeof path !== 'string') return '';
  // Sanitize for Windows-style backslashes
  let correctedPath = path.replace(/\\/g, '/');
  // Find 'public/' and strip it from the start of the path
  const publicIndex = correctedPath.indexOf('public/');
  if (publicIndex !== -1) {
    return correctedPath.substring(publicIndex + 'public'.length);
  }
  return correctedPath;
}

// Helper function to format date strings for input fields
function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProductDevelopmentPage() {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", sku: "", category: "", description: "", images: [], startDate: "", deadline: "" });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [sortOrder, setSortOrder] = useState('deadline-asc');
  const today = new Date().toISOString().split('T')[0];

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      const formattedData = data.map(p => {
        let images = [];
        if (typeof p.images === 'string') {
          try { images = JSON.parse(p.images); } catch (e) { images = [p.images]; }
        } else if (Array.isArray(p.images)) {
          images = p.images;
        }
        
        return { ...p, images: Array.isArray(images) ? images.map(sanitizeImagePath) : [] };
      });
      setProducts(formattedData);

    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, name: "", sku: "", category: "", description: "", images: [], startDate: "", deadline: "" });
    setImagePreviews([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newImagePreviews = files.map(file => URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, images: files }));
      setImagePreviews(newImagePreviews);
    } else {
      setFormData((prev) => ({ ...prev, images: [] }));
      setImagePreviews([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('description', formData.description);
    data.append('startDate', formData.startDate);
    data.append('deadline', formData.deadline);

    const isEditing = !!formData.id;
    if (isEditing) {
      data.append('id', formData.id);
    }

    const newImageFiles = formData.images.filter(img => img instanceof File);
    if (newImageFiles.length > 0) {
      newImageFiles.forEach(file => data.append('images', file));
    }

    try {
      // Final attempt: All operations (Create and Update) are POST to the collection endpoint.
      // The backend will differentiate based on the presence of an 'id'.
      const res = await fetch('/api/products', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
            try {
                errorMessage = await res.text() || errorMessage;
            } catch (textError) {}
        }
        throw new Error(errorMessage);
      }
      await fetchProducts();
    } catch (error) {
      console.error("Error submitting product:", error);
      alert(`Failed to save product: ${error.message}`);
    }
    closeModal();
  };

  const handleEdit = (product) => {
    setFormData({
      ...product,
      startDate: formatDateForInput(product.startDate),
      deadline: formatDateForInput(product.deadline),
    });
    setImagePreviews(product.images || []);
    openModal();
  };

  const handleDelete = async (productId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menghapus produk');
      }
      await fetchProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const todayForComparison = new Date();
  todayForComparison.setHours(0, 0, 0, 0);

  const sortedProducts = [...products].sort((a, b) => {
    const [sortField, sortDirection] = sortOrder.split('-');
    const field = sortField === 'deadline' ? 'deadline' : 'startDate';
    const dateA = new Date(a[field]);
    const dateB = new Date(b[field]);
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });
  
  const totalProducts = products.length;
  const lateProductsCount = products.filter(p => new Date(p.deadline) < todayForComparison).length;
  const ongoingProductsCount = totalProducts - lateProductsCount;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Kembali</span></Link>
      </div>
      <h1 className={styles.title}>Product Development</h1>
      
      <div className={styles.overviewContainer} style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
        <div className={styles.overviewCard} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
          <h3>Total Products</h3><p style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalProducts}</p>
        </div>
        <div className={styles.overviewCard} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
          <h3>Ongoing</h3><p style={{ fontSize: '24px', fontWeight: 'bold' }}>{ongoingProductsCount}</p>
        </div>
        <div className={styles.overviewCard} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
          <h3>Late</h3><p style={{ fontSize: '24px', fontWeight: 'bold' }}>{lateProductsCount}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.sortContainer}>
          <label htmlFor="sort-select">Sort by:</label>
          <select id="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={styles.sortSelect}>
            <option value="deadline-asc">Deadline (Soonest First)</option>
            <option value="deadline-desc">Deadline (Latest First)</option>
            <option value="start-asc">Start Date (Oldest First)</option>
            <option value="start-desc">Start Date (Newest First)</option>
          </select>
        </div>
        <button onClick={openModal} className={styles.addButton}>Tambah Produk</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Gambar</th><th>Nama Produk</th><th>SKU</th><th>Kategori</th><th>Deskripsi</th><th>Tanggal Mulai</th><th>Deadline</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => {
              const isLate = new Date(product.deadline) < todayForComparison;
              const status = isLate ? "Late" : "Ongoing";
              return (
                <tr key={product.id}>
                  <td>
                    <div className={styles.productImageContainer}>
                      {product.images.map((imgSrc, index) => (
                        <img key={index} src={imgSrc} alt={`${product.name} ${index + 1}`} width={50} height={50} className={styles.productImage} />
                      ))}
                    </div>
                  </td>
                  <td>{product.name}</td><td>{product.sku}</td><td>{product.category}</td><td>{product.description}</td>
                  <td>{formatDateForInput(product.startDate)}</td><td>{formatDateForInput(product.deadline)}</td>
                  <td><span className={`${styles.status} ${isLate ? styles.late : styles.ongoing}`}>{status}</span></td>
                  <td className={styles.actionButtons}>
                    <button onClick={() => handleEdit(product)}><FaEdit /></button>
                    <button onClick={() => handleDelete(product.id)}><FaTrash /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{formData.id ? "Edit Produk" : "Tambah Produk Baru"}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}><label>Nama Produk</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>SKU</label><input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Kategori</label><input type="text" name="category" value={formData.category} onChange={handleInputChange} required /></div>
              <div className={styles.formGroup}><label>Deskripsi</label><textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"></textarea></div>
              <div className={styles.formGroup}><label>Tanggal Mulai</label><input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required min={today} /></div>
              <div className={styles.formGroup}><label>Deadline</label><input type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} required max="2099-12-31" /></div>
              <div className={styles.formGroup}>
                <label>Gambar Produk</label>
                <input type="file" name="images" onChange={handleFileChange} multiple />
                <div className={styles.imagePreviewContainer}>
                  {imagePreviews.map((previewUrl, index) => (
                    <img key={index} src={previewUrl} alt={`Preview ${index + 1}`} width={100} height={100} style={{ marginTop: '10px', marginRight: '10px' }} />
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>Batal</button>
                <button type="submit" className={styles.saveButton}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
