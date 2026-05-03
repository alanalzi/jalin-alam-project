"use client"

import styles from "./skeleton.module.css"

export function Skeleton({ width, height, borderRadius = "8px", className = "" }) {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{
                width: width || "100%",
                height: height || "20px",
                borderRadius: borderRadius
            }}
        />
    )
}

export function SkeletonCard() {
    return (
        <div className={styles.skeletonCard}>
            <Skeleton width="60px" height="60px" borderRadius="14px" />
            <div className={styles.skeletonInfo}>
                <Skeleton width="80px" height="14px" />
                <Skeleton width="40px" height="28px" />
            </div>
        </div>
    )
}

export function SkeletonRow() {
    return (
        <tr className={styles.skeletonRow}>
            <td><Skeleton width="80%" height="20px" /></td>
            <td><Skeleton width="60%" height="20px" /></td>
            <td><Skeleton width="70%" height="20px" /></td>
            <td><Skeleton width="40%" height="20px" /></td>
        </tr>
    )
}
