"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import styles from './product-detail.module.css'; // Import the CSS module

// Helper function to format date strings for database (YYYY-MM-DD)
function formatDateForDatabase(dateString) {
  if (!dateString) return null; // Convert empty or null to null
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null; // Invalid date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [requiredMaterials, setRequiredMaterials] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for image preview modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const showNextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % product.images.length
    );
  };

  const showPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex - 1 + product.images.length) % product.images.length
    );
  };

  async function fetchProduct() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setRequiredMaterials(data.requiredMaterials || []);
        setChecklist(data.checklist || []);
      } else {
        let errorMsg = `HTTP Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      setProduct(null);
      alert(`Error fetching product: ${String(error.message)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleChecklistChange = (taskId) => {
    setChecklist(
      checklist.map((task) =>
        task.id === taskId ? { ...task, is_completed: !task.is_completed } : task
      )
    );
  };

  const handleSaveChecklist = async () => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checklist }),
      });

      if (res.ok) {
        alert('Checklist updated successfully!');
        fetchProduct(); // Re-fetch to get updated percentage
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update checklist');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Helper function to determine the status (Ongoing/Late) based solely on deadline
  const getStatus = (deadline) => {
    if (!deadline) return 'Ongoing'; // No deadline, assume ongoing

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

    const deadlineDate = new Date(deadline);
    // Ensure the deadlineDate is a valid date object before comparison
    if (isNaN(deadlineDate.getTime())) {
      // If deadline is invalid, fall back to default or a specific error status
      // For now, let's assume 'Ongoing' if the date is invalid and cannot be compared.
      return 'Ongoing'; 
    }
    deadlineDate.setHours(0, 0, 0, 0); // Normalize deadline date to start of day
    
    if (deadlineDate < today) {
      return 'Late';
    }
    return 'Ongoing';
  };

  // Helper to get CSS class for status
  const getStatusClassName = (deadline) => { // Removed productStatus
    const status = getStatus(deadline); // Removed productStatus
    if (status === 'Late') {
      return styles.statusLate;
    } else if (status === 'Ongoing') {
      return styles.statusOngoing;
    }
    return '';
  };

  // Helper to get display text for status
  const getDisplayStatus = (deadline) => { // Removed productStatus
    return getStatus(deadline); // Removed productStatus
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className={styles.container}>
      <Link href="/product" className={styles.backLink}>
        <FaArrowLeft />
        <span>Back to Product Development</span>
      </Link>
      
      <h1 className={styles.productName}>{product.name}</h1>
      <div className={styles.imageGallery}>
        {product.images && product.images.length > 0 ? (
          product.images.map((image, index) => (
            <img 
              key={index} 
              src={image} 
              alt={`${product.name} image ${index + 1}`} 
              width={150} 
              height={150} 
              className={styles.productImage} 
              onClick={() => openImageModal(index)} // Make image clickable
            />
          ))
        ) : (
          <img 
            src="https://via.placeholder.com/150" 
            alt="No Product Image" 
            width={150} 
            height={150} 
            className={styles.productImage} 
          />
        )}
      </div>
      {product.type === 'New Product' && (
        <p className={styles.productInfo}><strong>SKU:</strong> {product.inquiry_code}</p>
      )}
      {product.type === 'Custom' && (
        <p className={styles.productInfo}><strong>Inquiry Code:</strong> {product.inquiry_code}</p>
      )}
      <p className={styles.productInfo}><strong>Category:</strong> {product.category}</p>
      <p className={styles.productInfo}><strong>Type:</strong> {product.type}</p>
      
      <p className={styles.productInfo}><strong>Start Date:</strong> {formatDateForDatabase(product.start_date)}</p>
      <p className={styles.productInfo}><strong>Deadline:</strong> {formatDateForDatabase(product.deadline)}</p>

      <p className={styles.productInfo}>
        <strong>Status:</strong> <span className={getStatusClassName(product.deadline)}>{getDisplayStatus(product.deadline)}</span>
      </p>
      {product.overall_checklist_percentage !== undefined && (
        <p className={styles.productInfo}><strong>Checklist Progress:</strong> {product.overall_checklist_percentage}%</p>
      )}
      <p className={styles.productInfo}><strong>Description:</strong> {product.description}</p>
      {product.type === 'Custom' && product.customer_request && (
        <p className={styles.productInfo}><strong>Customer Request:</strong> {product.customer_request}</p>
      )}
      {product.type === 'Custom' && product.order_quantity && (
        <p className={styles.productInfo}><strong>Order Quantity:</strong> {product.order_quantity}</p>
      )}
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Supplier</h2>
        {requiredMaterials.length > 0 ? (
          <table className={styles.supplierTable}>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Supplier Description</th>
                <th>Contact Info</th>
              </tr>
            </thead>
            <tbody>
              {requiredMaterials.map((material) => (
                <tr key={material.material_id}>
                  <td>{material.material_name}</td>
                  <td>{material.supplier_description}</td>
                  <td>{material.contact_info_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.noMaterials}>No raw materials required for this product.</p>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Checklist</h2>
        {checklist.length > 0 ? (
          <div className={styles.checklistContainer}>
            {checklist.map((task) => (
              <div key={task.id} className={styles.checklistItem}>
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  checked={task.is_completed}
                  onChange={() => handleChecklistChange(task.id)}
                />
                <label htmlFor={`task-${task.id}`}>{task.task}</label>
              </div>
            ))}
            <button onClick={handleSaveChecklist} className={styles.saveButton}>
              Save Checklist
            </button>
          </div>
        ) : (
          <p>No checklist items for this product.</p>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {isImageModalOpen && product.images && product.images.length > 0 && (
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeImageModalButton} onClick={closeImageModal}><FaTimes /></button>
            <img 
              src={product.images[currentImageIndex]} 
              alt={`${product.name} image ${currentImageIndex + 1}`} 
              className={styles.modalImage} 
            />
            {product.images.length > 1 && (
              <>
                <button className={styles.prevImageButton} onClick={showPrevImage}><FaChevronLeft /></button>
                <button className={styles.nextImageButton} onClick={showNextImage}><FaChevronRight /></button>
              </>
            )}
            <div className={styles.imageCounter}>
              {currentImageIndex + 1} / {product.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
