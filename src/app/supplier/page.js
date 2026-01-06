"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../product/product-development.module.css"; // Reusing styles for now
import { FaArrowLeft, FaEdit, FaTrash, FaTruck } from "react-icons/fa";

export default function SupplierPage() {
  const [materials, setMaterials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", contact_info_text: "", supplier_description: "" });

  async function fetchMaterials() {
    try {
      const res = await fetch('/api/supplier');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      } else {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
          // Error response was not valid JSON
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      alert(`Error fetching suppliers: ${error.message}`);
      setMaterials([]);
    }
  }

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, name: "", contact_info_text: "", supplier_description: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id, name, contact_info_text, supplier_description } = formData;
    const url = id ? `/api/supplier/${id}` : '/api/supplier';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact_info_text, supplier_description }),
      });

      if (res.ok) {
        await fetchMaterials();
        closeModal();
      } else {
        let errorMsg = `Failed to save supplier. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
          //
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error submitting raw material:", error);
      alert(error.message);
    }
  };

  const handleEdit = (material) => {
    setFormData(material);
    openModal();
  };

  const handleDelete = async (materialId) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetch(`/api/supplier/${materialId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchMaterials();
      } else {
        let errorMsg = `Failed to delete. Status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          //
        }
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Error in handleDelete:", err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard" className={styles.backButton}><FaArrowLeft size={20} /><span>Back to Dashboard</span></Link>
      </div>
      <div className={styles.titleContainer}>
        <FaTruck className={styles.titleIcon} />
        <h1 className={styles.title}>Supplier Management</h1>
      </div>

      <div className={styles.toolbar}>
        <button onClick={openModal} className={styles.addButton}>Add Supplier</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Info</th>
              <th>Supplier Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>{material.name}</td>
                <td>{material.contact_info_text}</td>
                <td>{material.supplier_description}</td>
                <td className={styles.actionButtons}>
                  <button onClick={() => handleEdit(material)}><FaEdit /></button>
                  <button onClick={() => handleDelete(material.id)}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{formData.id ? "Edit Supplier" : "Add New Supplier"}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Info (Phone/Email)</label>
                <input type="text" name="contact_info_text" value={formData.contact_info_text} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Supplier Description</label>
                <input type="text" name="supplier_description" value={formData.supplier_description} onChange={handleInputChange} required />
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
