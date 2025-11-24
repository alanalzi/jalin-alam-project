// jalin-alam/src/app/api/products/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import path from 'path';
import { promises as fs } from 'fs';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Replace with your MySQL password
  database: process.env.DB_NAME || 'jalin_alam',
};

export async function GET() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Fetch products and their images using a JOIN
    const [rows] = await connection.execute(`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.category,
        p.description,
        p.start_date AS startDate,
        p.deadline,
        GROUP_CONCAT(pi.image_url ORDER BY pi.id ASC) AS images
      FROM
        products p
      LEFT JOIN
        product_images pi ON p.id = pi.product_id
      GROUP BY
        p.id, p.name, p.sku, p.category, p.description, p.start_date, p.deadline
      ORDER BY p.id DESC
    `);

    // Process rows to group images into an array for each product
    const products = rows.map(row => ({
      ...row,
      images: row.images ? row.images.split(',') : [],
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Database connection or query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(req) {
  let connection;
  const formData = await req.formData();
  const name = formData.get('name');
  const sku = formData.get('sku');
  const category = formData.get('category');
  const description = formData.get('description');
  const startDate = formData.get('startDate');
  const deadline = formData.get('deadline');
  const images = formData.getAll('images');

  try {
    if (!name || !sku) {
      return NextResponse.json({ message: 'Name and SKU are required' }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const [productResult] = await connection.execute(
      `INSERT INTO products (name, sku, category, description, start_date, deadline) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, sku, category, description, startDate, deadline]
    );

    const productId = productResult.insertId;

    if (images && images.length > 0) {
      const uploadDir = path.join(process.cwd(), 'jalin-alam', 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      for (const image of images) {
        if (image instanceof File) {
          const buffer = Buffer.from(await image.arrayBuffer());
          const uniqueFilename = `${Date.now()}-${image.name.replace(/\s+/g, '_')}`;
          const savePath = path.join(uploadDir, uniqueFilename);
          
          await fs.writeFile(savePath, buffer);
          
          const imageUrl = `/uploads/${uniqueFilename}`;
          
          await connection.execute(
            `INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`,
            [productId, imageUrl]
          );
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ message: 'Product added successfully', productId }, { status: 201 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Failed to process POST request:', error);

    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: `SKU '${sku}' sudah ada. Silakan gunakan SKU yang lain.` }, { status: 409 });
    }

    return NextResponse.json({ message: 'Gagal menambahkan produk', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
