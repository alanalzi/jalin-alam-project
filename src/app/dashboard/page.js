"use client"

import { useState, useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaTrash } from "react-icons/fa";

// Helper to sanitize image paths received from the server
function sanitizeImagePath(path) {
  if (typeof path !== 'string') return '';
  let correctedPath = path.replace(/\\/g, '/');
  const publicIndex = correctedPath.indexOf('public/');
  if (publicIndex !== -1) {
    return correctedPath.substring(publicIndex + 'public'.length);
  }
  return correctedPath;
}

// Helper function to format date strings for display
function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortOrder, setSortOrder] = useState('deadline-asc');

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      
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

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (e, productId) => {
    e.stopPropagation();
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

  const openModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
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

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.productOverview}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0' }}>Product Overview</h2>
          <div className={styles.sortContainer}>
            <label htmlFor="sort-select">Sort by:</label>
            <select id="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={styles.sortSelect}>
              <option value="deadline-asc">Deadline (Soonest First)</option>
              <option value="deadline-desc">Deadline (Latest First)</option>
              <option value="start-asc">Start Date (Oldest First)</option>
              <option value="start-desc">Start Date (Newest First)</option>
            </select>
          </div>
        </div>
        
        {isLoading && <p>Loading products...</p>}
        {error && <p>Error: {error}</p>}
        {!isLoading && !error && products.length === 0 ? (
          <p>No products available. Add some in Product Development.</p>
        ) : (
          <div className={styles.productList}>
            {sortedProducts.map((product) => {
              const isLate = new Date(product.deadline) < todayForComparison;
              const status = isLate ? "Late" : "Ongoing";
              const imageSrc = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150';

              return (
                <div key={product.id} className={`${styles.productItem} ${isLate ? styles.productItemLate : ''}`} >
                  <div className={styles.productMainInfo} onClick={() => openModal(product)}>
                    <img src={imageSrc} alt={product.name} width={60} height={60} className={styles.productImageSmall} />
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productCategory}>{product.category}</p>
                    </div>
                    <div className={styles.productDates}>
                      <p><strong>Mulai:</strong> {formatDateForDisplay(product.startDate)}</p>
                      <p><strong>Deadline:</strong> {formatDateForDisplay(product.deadline)}</p>
                    </div>
                    <div className={`${styles.status} ${isLate ? styles.late : styles.ongoing}`}>{status}</div>
                  </div>
                  <div className={styles.productActions}>
                    {isLate && (
                      <button onClick={(e) => handleDelete(e, product.id)} className={styles.deleteButton}><FaTrash /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && selectedProduct && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{selectedProduct.name}</h2>
            <div className={styles.modalBody}>
              <img 
                src={selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[0] : 'https://via.placeholder.com/150'}
                alt={selectedProduct.name}
                width={150} height={150} 
                className={styles.modalImage}
              />
              <p><strong>SKU:</strong> {selectedProduct.sku}</p>
              <p><strong>Kategori:</strong> {selectedProduct.category}</p>
              <p><strong>Deskripsi:</strong> {selectedProduct.description}</p>
              <p><strong>Tanggal Mulai:</strong> {formatDateForDisplay(selectedProduct.startDate)}</p>
              <p><strong>Deadline:</strong> {formatDateForDisplay(selectedProduct.deadline)}</p>
            </div>
            <div className={styles.modalActions}>
              <button onClick={closeModal} className={styles.closeButton}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}