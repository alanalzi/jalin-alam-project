// jalin-alam/src/app/api/products/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};

export async function GET(request) {
  const inquiryCode = request.nextUrl.searchParams.get('inquiryCode');
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    let query = `
      SELECT
        p.id,
        p.name,
        p.inquiry_code,
        p.category,
        p.description,
        p.start_date AS startDate,
        p.deadline,
        p.status,
        p.type,
        GROUP_CONCAT(pi.image_url ORDER BY pi.id ASC) AS images,
        COALESCE(ROUND(AVG(CASE WHEN pc.is_completed = 1 THEN 100 ELSE 0 END)), 0) AS overall_checklist_percentage
      FROM
        products p
      LEFT JOIN
        product_images pi ON p.id = pi.product_id
      LEFT JOIN
        product_checklists pc ON p.id = pc.product_id`;
    
    const queryParams = [];

    if (inquiryCode) {
      query += ` WHERE p.inquiry_code = ?`;
      queryParams.push(inquiryCode);
    }

    query += `
      GROUP BY
        p.id, p.name, p.inquiry_code, p.category, p.description, p.start_date, p.deadline, p.status, p.type
      ORDER BY p.id DESC
    `;
    
    const [rows] = await connection.execute(query, queryParams);
    
    // Process rows to group images into an array for each product
    const products = rows.map(row => ({
      ...row,
      images: row.images ? row.images.split(',') : [],
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(req) {
  let connection;
  const { name, inquiry_code, category, description, startDate, deadline, status, requiredMaterials, images, type } = await req.json();

  console.log('POST /api/products: Incoming payload for new product');
  console.log('Payload name:', name);
  console.log('Payload inquiry_code:', inquiry_code);
  console.log('Payload type:', type);

  console.log('Payload requiredMaterials:', requiredMaterials);
  console.log('Payload images:', images);

  try {
    if (!name || !inquiry_code) {
      return NextResponse.json({ message: 'Name and Inquiry Code are required' }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // Insert new product
    const [productResult] = await connection.execute(
      `INSERT INTO products (name, inquiry_code, category, description, start_date, deadline, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, inquiry_code, category, description, startDate, deadline, status || 'ongoing', type || 'Standard']
    );
    const productId = productResult.insertId;
    console.log('Product inserted with ID:', productId);

    // Handle required materials
    if (requiredMaterials && requiredMaterials.length > 0) {
      console.log('Processing required materials...');
      for (const supplier of requiredMaterials) {
        const materialId = supplier.supplier_id;
        const quantityNeeded = 1; // Default quantity as it's no longer specified in the UI

        console.log('Material ID from frontend (supplier_id):', materialId);
        console.log('Default quantity needed:', quantityNeeded);

        // Check if the supplier (material) actually exists in the suppliers table
        const [existingSupplier] = await connection.execute(
            'SELECT id FROM suppliers WHERE id = ?',
            [materialId]
        );
        console.log('Existing supplier query result for materialId', materialId, ':', existingSupplier);


        if (existingSupplier.length === 0) {
            await connection.rollback();
            return NextResponse.json(
                { message: `Supplier with ID ${materialId} not found.` },
                { status: 400 }
            );
        }

        // Link product to the material (supplier)
        console.log('Inserting into product_materials:', { productId, materialId, quantityNeeded });
        await connection.execute(
          'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
          [productId, materialId, quantityNeeded]
        );
      }
    }

    // Handle product images
    if (images && Array.isArray(images) && images.length > 0) {
      console.log('Processing product images...');
      const imageValues = images.map(imageUrl => [productId, imageUrl]);
      console.log('Inserting image values:', imageValues);
      await connection.query(
        'INSERT INTO product_images (product_id, image_url) VALUES ?',
        [imageValues]
      );
    }

    await connection.commit();
    return NextResponse.json({ message: 'Product added successfully', productId }, { status: 201 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Failed to process POST request:', error); // Log the full error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: `Inquiry Code '${inquiry_code}' already exists. Please use a different Inquiry Code.` }, { status: 409 });
    }

    return NextResponse.json({ message: 'Failed to add product', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

