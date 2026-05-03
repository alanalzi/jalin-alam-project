// jalin-alam/src/app/product/[id]/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import ProductDetailContent from '../ProductDetailContent';
import styles from './product-detail.module.css';

export default function ProductDetailPage() {
  const { id } = useParams();

  return (
    <div className={styles.container}>
      <Link href="/product" className={styles.backLink}>
        <FaArrowLeft />
        <span>Back to Product Development</span>
      </Link>

      <div className={styles.modalBody}>
        <ProductDetailContent productId={id} />
      </div>
    </div>
  );
}
