"use client"

import { useState, useEffect } from "react"
import styles from "./dashboard.module.css"
import { FaTrash } from "react-icons/fa"; // Import trash icon

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await res.json();
      setProducts(data);
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
    e.stopPropagation(); // Prevent the modal from opening
    
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menghapus produk');
      }

      // Refresh product list from server to ensure consistency
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

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.productOverview}>
        <h2 className={styles.sectionTitle}>Product Overview</h2>
        {isLoading && <p>Loading products...</p>}
        {error && <p>Error: {error}</p>}
        {!isLoading && !error && products.length === 0 ? (
          <p>No products available. Add some in Product Development.</p>
        ) : (
          <div className={styles.productList}>
            {products.map((product) => {
              const today = new Date();
              const deadlineDate = new Date(product.deadline);
              const isLate = deadlineDate < today;
              const status = isLate ? "Late" : "Ongoing";

              const imageSrc = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150';

              return (
                <div key={product.id} className={`${styles.productItem} ${isLate ? styles.productItemLate : ''}`} >
                  <div className={styles.productMainInfo} onClick={() => openModal(product)}>
                    <img src={imageSrc} alt={product.name} width={60} height={60} className={styles.productImageSmall} />
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productCategory}>{product.category}</p>
                    </div>
                    <div className={styles.productDates}>
                      <p><strong>Mulai:</strong> {product.startDate}</p>
                      <p><strong>Deadline:</strong> {product.deadline}</p>
                    </div>
                    <div className={`${styles.status} ${isLate ? styles.late : styles.ongoing}`}>
                      {status}
                    </div>
                  </div>
                  <div className={styles.productActions}>
                    {isLate && (
                      <button onClick={(e) => handleDelete(e, product.id)} className={styles.deleteButton}>
                        <FaTrash />
                      </button>
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
                src={Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0 ? selectedProduct.images[0] : 'https://via.placeholder.com/150'} 
                alt={selectedProduct.name} 
                width={150} 
                height={150} 
                className={styles.modalImage}
              />
              <p><strong>SKU:</strong> {selectedProduct.sku}</p>
              <p><strong>Kategori:</strong> {selectedProduct.category}</p>
              <p><strong>Deskripsi:</strong> {selectedProduct.description}</p>
              <p><strong>Tanggal Mulai:</strong> {selectedProduct.startDate}</p>
              <p><strong>Deadline:</strong> {selectedProduct.deadline}</p>
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
