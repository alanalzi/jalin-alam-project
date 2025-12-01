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
             p.id,
             p.name,
             p.inquiry_code,
             p.category,
             p.description,
             p.start_date AS startDate,
             p.deadline AS deadline,
             p.status,
             p.type
           FROM products p
           WHERE p.id = ?`,
          [id]
        );    if (productRows.length === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const product = productRows[0];

    // IF product.type is 'Custom' and inquiry_code exists, fetch inquiry details
    if (product.type === 'Custom' && product.inquiry_code) {
      const [inquiryRows] = await connection.execute(
        `SELECT customer_request, order_quantity
         FROM inquiries
         WHERE inquiry_code = ?`,
        [product.inquiry_code]
      );
      if (inquiryRows.length > 0) {
        product.customer_request = inquiryRows[0].customer_request;
        product.order_quantity = inquiryRows[0].order_quantity;
      }
    }

    // Fetch product images
    const [imageRows] = await connection.execute('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
    product.images = imageRows.map(row => row.image_url);

        // Fetch product checklist
        const [checklistRows] = await connection.execute('SELECT * FROM product_checklists WHERE product_id = ?', [id]);
        product.checklist = checklistRows;
    
        // Calculate overall percentage for checklist
        if (product.checklist && product.checklist.length > 0) {
          const totalPercentageSum = product.checklist.reduce((sum, task) => sum + (task.percentage || 0), 0);
          product.overall_checklist_percentage = Math.round(totalPercentageSum / product.checklist.length);
        } else {
          product.overall_checklist_percentage = 0;
        }
    
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
        `, [id]);    product.requiredMaterials = materialRows;

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
    const { id } = context.params;
    const {
        name,
        inquiry_code, // Renamed from sku to inquiry_code
        category,
        description,
        startDate,
        deadline,
        status,
        checklist,
        requiredMaterials,
        images
    } = await request.json();

    console.log('PUT /api/products/[id]: Incoming payload for product ID:', id);

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

        // --- Dynamically build the UPDATE query for the 'products' table ---
        const fieldsToUpdate = [];
        const values = [];

        if (name !== undefined) {
            fieldsToUpdate.push('name = ?');
            values.push(name === '' ? null : name);
        }
        if (inquiry_code !== undefined) {
            fieldsToUpdate.push('inquiry_code = ?');
            values.push(inquiry_code === '' ? null : inquiry_code);
        }
        if (category !== undefined) {
            fieldsToUpdate.push('category = ?');
            values.push(category === '' ? null : category);
        }
        if (description !== undefined) {
            fieldsToUpdate.push('description = ?');
            values.push(description === '' ? null : description);
        }
        if (startDate !== undefined) {
            fieldsToUpdate.push('start_date = ?');
            values.push(startDate === '' ? null : startDate);
        }
        if (deadline !== undefined) {
            fieldsToUpdate.push('deadline = ?');
            values.push(deadline === '' ? null : deadline);
        }
        if (status !== undefined) {
            fieldsToUpdate.push('status = ?');
            values.push(status === '' ? null : status);
        }

        if (fieldsToUpdate.length > 0) {
            const updateProductQuery = `UPDATE products SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
            await connection.execute(updateProductQuery, [...values, id]);
            console.log('Product details updated for ID:', id);
        }


        // --- Update checklist if provided ---
        if (checklist !== undefined) {
            console.log('Updating checklist for product ID:', id);
            await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [id]);
            if (Array.isArray(checklist) && checklist.length > 0) {
                const checklistValues = checklist.map(item => [id, item.task, item.percentage]);
                console.log('Inserting checklist values:', checklistValues);
                await connection.query(
                    'INSERT INTO product_checklists (product_id, task, percentage) VALUES ?',
                    [checklistValues]
                );
            }
        }
        
        // --- Update requiredMaterials if provided ---
        if (requiredMaterials !== undefined) {
            console.log('Updating required materials for product ID:', id);
            await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);

            if (Array.isArray(requiredMaterials) && requiredMaterials.length > 0) {
                for (const supplier of requiredMaterials) {
                    const materialId = supplier.supplier_id;
                    const quantityNeeded = 1; // Default quantity

                    if (materialId === undefined || materialId === null) {
                        console.error('Skipping required material due to undefined materialId:', supplier);
                        continue;
                    }

                    const [existingSupplier] = await connection.execute(
                        'SELECT id FROM suppliers WHERE id = ?',
                        [materialId]
                    );

                    if (existingSupplier.length === 0) {
                        await connection.rollback();
                        return NextResponse.json(
                            { message: `Supplier with ID ${materialId} not found.` },
                            { status: 400 }
                        );
                    }

                    await connection.execute(
                        'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
                        [id, materialId, quantityNeeded]
                    );
                }
            }
        }

        // --- Update images if provided ---
        if (images !== undefined) {
            console.log('Updating product images for product ID:', id);
            await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
            if (Array.isArray(images) && images.length > 0) {
                const imageValues = images.map(imageUrl => [id, imageUrl]);
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