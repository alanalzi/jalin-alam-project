"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./product-development.module.css";
import { FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";

// Dummy data for products
const initialProducts = [
  { id: 1, name: "Tas Rotan", sku: "TR-001", category: "Aksesoris", description: "Tas anyaman rotan alami.", image: "https://via.placeholder.com/150", startDate: "2025-11-20", deadline: "2025-12-20" },
  { id: 2, name: "Kursi Bambu", sku: "KB-001", category: "Furnitur", description: "Kursi santai dari bambu.", image: "https://via.placeholder.com/150", startDate: "2025-11-25", deadline: "2025-12-25" },
];

export default function ProductDevelopmentPage() {
  const [products, setProducts] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedProducts = localStorage.getItem("products");
      if (storedProducts) {
        try {
          return JSON.parse(storedProducts);
        } catch (error) {
          console.error("Error parsing products from localStorage", error);
          return initialProducts;
        }
      }
    }
    return initialProducts;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("products", JSON.stringify(products));
    }
  }, [products]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", sku: "", category: "", description: "", image: null, startDate: "", deadline: "" });
  const [imagePreview, setImagePreview] = useState("");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, name: "", sku: "", category: "", description: "", image: null, startDate: "", deadline: "" });
    setImagePreview("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = formData.image;

    if (formData.image && typeof formData.image !== 'string') {
      const data = new FormData();
      data.append('file', formData.image);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (result.success) {
        imageUrl = result.url;
      } else {
        // Handle upload error
        console.error("Image upload failed");
        return;
      }
    }

    const productData = { ...formData, image: imageUrl };

    if (formData.id) {
      // Edit product
      setProducts(products.map(p => p.id === formData.id ? productData : p));
    } else {
      // Add new product
      setProducts([...products, { ...productData, id: Date.now() }]);
    }
    closeModal();
  };

  const handleEdit = (product) => {
    setFormData(product);
    setImagePreview(product.image);
    openModal();
  };

  const handleDelete = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}>
          <FaArrowLeft size={20} />
          <span>Kembali</span>
        </Link>
      </div>
      <h1 className={styles.title}>Product Development</h1>

      <div className={styles.toolbar}>
        <button onClick={openModal} className={styles.addButton}>
          Tambah Produk
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Gambar</th>
              <th>Nama Produk</th>
              <th>SKU</th>
              <th>Kategori</th>
              <th>Deskripsi</th>
              <th>Tanggal Mulai</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const today = new Date();
              const deadlineDate = new Date(product.deadline);
              const isLate = deadlineDate < today;
              const status = isLate ? "Late" : "Ongoing";

              return (
                <tr key={product.id}>
                  <td>
                    <Image src={product.image} alt={product.name} width={80} height={80} className={styles.productImage} />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category}</td>
                  <td>{product.description}</td>
                  <td>{product.startDate}</td>
                  <td>{product.deadline}</td>
                  <td>
                    <span className={`${styles.status} ${isLate ? styles.late : styles.ongoing}`}>
                      {status}
                    </span>
                  </td>
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
              <div className={styles.formGroup}>
                <label>Nama Produk</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>SKU</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Kategori</label>
                <input type="text" name="category" value={formData.category} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Deskripsi</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"></textarea>
              </div>
              <div className={styles.formGroup}>
                <label>Tanggal Mulai</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Deadline</label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Gambar Produk</label>
                <input type="file" name="image" onChange={handleInputChange} />
                {imagePreview && <Image src={imagePreview} alt="Preview" width={100} height={100} style={{ marginTop: '10px' }} />}
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