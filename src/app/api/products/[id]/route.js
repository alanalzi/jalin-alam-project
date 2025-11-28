// jalin-alam/src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};


export async function GET(request, context) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Fetch product details
    const [productRows] = await connection.execute(
      `SELECT 
         p.*
       FROM products p
       WHERE p.id = ?`, 
      [id]
    );
    if (productRows.length === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const product = productRows[0];

    // Fetch product images
    const [imageRows] = await connection.execute('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
    product.images = imageRows.map(row => row.image_url);

    // Fetch product checklist
    const [checklistRows] = await connection.execute('SELECT * FROM product_checklists WHERE product_id = ?', [id]);
    product.checklist = checklistRows;

    // Fetch required materials
    const [materialRows] = await connection.execute(`
        SELECT 
            pm.material_id, 
            rm.name as material_name, 
            pm.quantity_needed,
            rm.supplier_description,
            rm.contact_info_text
        FROM product_materials pm
        JOIN suppliers rm ON pm.material_id = rm.id
        WHERE pm.product_id = ?
    `, [id]);
    product.requiredMaterials = materialRows;

    return NextResponse.json(product);

  } catch (error) {
    console.error('Database query failed during GET:', error);
    return NextResponse.json({ message: 'Failed to fetch product', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function PUT(request, context) {
    const id = context.params.id; // Access id directly as recommended
    let { name, sku, category, description, startDate, deadline, status, checklist, requiredMaterials, images } = await request.json();

    console.log('PUT /api/products/[id]: Incoming payload for product ID:', id);
    console.log('Payload name:', name);

    console.log('Payload requiredMaterials:', requiredMaterials);
    console.log('Payload images:', images);
    console.log('Payload checklist:', checklist);

    const toNullIfEmptyOrUndefined = (value) => (value === undefined || value === '' ? null : value);

    if (!id) {
        return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        const [currentProductRows] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (currentProductRows.length === 0) {
            await connection.rollback();
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }
        const currentProduct = currentProductRows[0];

                const updatedName = toNullIfEmptyOrUndefined(name !== undefined ? name : currentProduct.name);

                const updatedSku = toNullIfEmptyOrUndefined(sku !== undefined ? sku : currentProduct.sku);

                const updatedCategory = toNullIfEmptyOrUndefined(category !== undefined ? category : currentProduct.category);

                const updatedDescription = toNullIfEmptyOrUndefined(description !== undefined ? description : currentProduct.description);

                const updatedStartDate = toNullIfEmptyOrUndefined(startDate !== undefined ? startDate : currentProduct.start_date);

                const updatedDeadline = toNullIfEmptyOrUndefined(deadline !== undefined ? deadline : currentProduct.deadline);

                const updatedStatus = toNullIfEmptyOrUndefined(status !== undefined ? status : currentProduct.status); // Add this line
        

                console.log('Updating product details for ID:', id);

                await connection.execute(

                    'UPDATE products SET name = ?, sku = ?, category = ?, description = ?, start_date = ?, deadline = ?, status = ? WHERE id = ?',

                    [updatedName, updatedSku, updatedCategory, updatedDescription, updatedStartDate, updatedDeadline, updatedStatus, id]

                );

        if (checklist !== undefined) {
            console.log('Updating checklist for product ID:', id);
            await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [id]);
            if (Array.isArray(checklist) && checklist.length > 0) {
                const checklistValues = checklist.map(item => [id, item.task, item.is_completed ? 1 : 0]);
                console.log('Inserting checklist values:', checklistValues);
                await connection.query(
                    'INSERT INTO product_checklists (product_id, task, is_completed) VALUES ?',
                    [checklistValues]
                );
            }
        }
        
        if (requiredMaterials !== undefined) {
            console.log('Updating required materials for product ID:', id);
            await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);

            if (Array.isArray(requiredMaterials) && requiredMaterials.length > 0) {
                for (const supplier of requiredMaterials) {
                    const materialId = supplier.supplier_id;
                    const quantityNeeded = 1; // Default quantity

                    if (materialId === undefined || materialId === null) {
                        console.error('Skipping required material due to undefined materialId:', supplier);
                        continue; // Skip this material if ID is invalid
                    }

                    console.log('Processing material ID:', materialId, 'for supplier:', supplier.supplier_name);
                    const [existingSupplier] = await connection.execute(
                        'SELECT id FROM suppliers WHERE id = ?',
                        [materialId]
                    );
                    console.log('Existing supplier query result:', existingSupplier);

                    if (existingSupplier.length === 0) {
                        await connection.rollback();
                        return NextResponse.json(
                            { message: `Supplier with ID ${materialId} not found.` },
                            { status: 400 }
                        );
                    }
            
                    console.log('Inserting into product_materials:', { productId: id, materialId, quantityNeeded });
                    await connection.execute(
                        'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
                        [id, materialId, quantityNeeded]
                    );
                }
            }
        }

        if (images !== undefined) {
            console.log('Updating product images for product ID:', id);
            await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
            if (Array.isArray(images) && images.length > 0) {
                const imageValues = images.map(imageUrl => [id, imageUrl]);
                console.log('Inserting image values:', imageValues);
                await connection.query(
                    'INSERT INTO product_images (product_id, image_url) VALUES ?',
                    [imageValues]
                );
            }
        }

        await connection.commit();
        return NextResponse.json({ message: 'Product updated successfully' });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Database query failed during PUT:', error);
        return NextResponse.json({ message: 'Failed to update product', error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

export async function DELETE(request, context) {
  const { id } = context.params;
  
  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
    await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [id]);
    await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);
    const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id]);

    await connection.commit();

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete product', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}