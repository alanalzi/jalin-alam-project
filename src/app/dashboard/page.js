"use client"

import { useState, useEffect } from "react"
import styles from "./dashboard.module.css"
import Image from "next/image"

// Dummy data for products (should match initialProducts in product/page.js)
const initialProducts = [
  { id: 1, name: "Tas Rotan", sku: "TR-001", category: "Aksesoris", description: "Tas anyaman rotan alami.", image: "https://via.placeholder.com/150", startDate: "2025-11-20", deadline: "2025-12-20" },
  { id: 2, name: "Kursi Bambu", sku: "KB-001", category: "Furnitur", description: "Kursi santai dari bambu.", image: "https://via.placeholder.com/150", startDate: "2025-11-25", deadline: "2025-12-25" },
];

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProducts = localStorage.getItem("products");
      if (storedProducts) {
        try {
          setProducts(JSON.parse(storedProducts));
        } catch (error) {
          console.error("Error parsing products from localStorage", error);
          setProducts(initialProducts);
        }
      } else {
        setProducts(initialProducts);
      }
    }
  }, []);

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
        {products.length === 0 ? (
          <p>No products available. Add some in Product Development.</p>
        ) : (
          <div className={styles.productList}>
            {products.map((product) => {
              const today = new Date();
              const deadlineDate = new Date(product.deadline);
              const isLate = deadlineDate < today;
              const status = isLate ? "Late" : "Ongoing";

              return (
                <div key={product.id} className={`${styles.productItem} ${isLate ? styles.productItemLate : ''}`} onClick={() => openModal(product)}>
                  <Image src={product.image} alt={product.name} width={60} height={60} className={styles.productImageSmall} />
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
              <Image src={selectedProduct.image} alt={selectedProduct.name} width={150} height={150} className={styles.modalImage} />
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
