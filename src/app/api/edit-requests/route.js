import createConnection from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function POST(req) {
  let connection;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { target_type, target_id, old_data, new_data } = await req.json();
    console.log("API Received Edit Request:", { target_type, target_id, requester: session.user.id });
    connection = await createConnection();
    
    // 1. Check if there's already a pending request for this target
    const [existing] = await connection.execute(
      "SELECT id FROM edit_requests WHERE target_type = ? AND target_id = ? AND status = 'pending'",
      [target_type, target_id]
    );

    if (existing.length > 0) {
      return Response.json({ 
        error: "Sudah ada permintaan edit yang menunggu validasi untuk item ini. Mohon tunggu persetujuan Direktur." 
      }, { status: 409 });
    }

    // 2. Data Integrity Validations
    try {
      const newDataObj = typeof new_data === 'string' ? JSON.parse(new_data) : new_data;
      if (newDataObj) {
        if (!newDataObj.order_quantity || parseInt(newDataObj.order_quantity) < 1) {
          return Response.json({ error: "Quantity harus minimal 1." }, { status: 400 });
        }

        // Date Validation
        const start = newDataObj.startDate || newDataObj.request_date || (old_data && (old_data.startDate || old_data.request_date));
        const end = newDataObj.deadline || newDataObj.image_deadline || (old_data && (old_data.deadline || old_data.image_deadline));
        if (start && end && new Date(end) < new Date(start)) {
          return Response.json({ error: "Tanggal Deadline tidak boleh lebih awal dari Tanggal Mulai/Request." }, { status: 400 });
        }

        // Status 'completed' vs Checklist validation
        // Inquiry specific validation
        if (target_type === 'inquiry') {
          if (!newDataObj.assignee_ids || newDataObj.assignee_ids.length === 0) {
            return Response.json({ error: "Inquiry harus memiliki setidaknya satu assignee." }, { status: 400 });
          }
        }

        if (newDataObj.status === 'completed') {
          // If the edit request also changes the checklist, use that. Otherwise use old_data.
          const checklist = newDataObj.checklist || (old_data && old_data.checklist);
          if (Array.isArray(checklist) && checklist.length > 0) {
            const allDone = checklist.every(task => parseInt(task.percentage) === 100);
            if (!allDone) {
              return Response.json({ error: "Produk tidak bisa ditandai 'Selesai' jika masih ada checklist yang belum 100%." }, { status: 400 });
            }
          }
        }
      }
    } catch (e) {
      console.error("Validation error in POST /api/edit-requests:", e);
    }

    // 3. Insert into edit_requests table
    const [result] = await connection.execute(
      `INSERT INTO edit_requests (target_type, target_id, requested_by, old_data, new_data, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        target_type, 
        target_id, 
        session.user.id, 
        JSON.stringify(old_data), 
        JSON.stringify(new_data)
      ]
    );

    // 4. Notify Direktur
    const [direkturs] = await connection.execute("SELECT id FROM users WHERE role = 'direktur'");
    if (direkturs.length > 0) {
      const notificationValues = direkturs.map(d => [
        d.id, 
        `Permintaan edit baru untuk ${target_type} #${target_id} oleh ${session.user.name}`, 
        '/validations'
      ]);
      await connection.query('INSERT INTO notifications (user_id, message, link) VALUES ?', [notificationValues]);
    }

    return Response.json({ 
      message: "Edit request submitted successfully. Waiting for Direktur approval.",
      requestId: result.insertId 
    });

  } catch (error) {
    console.error("Edit Request POST Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function GET(req) {
    let connection;
    try {
      const session = await getServerSession(authOptions);
      const userRole = session?.user?.role?.toLowerCase();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const { searchParams } = new URL(req.url);
      const targetId = searchParams.get('targetId');
      const targetType = searchParams.get('targetType');
      const status = searchParams.get('status') || 'pending';

      let query = `
        SELECT er.*, u.name as requester_name,
               CASE 
                 WHEN er.target_type = 'inquiry' THEN er.target_id
                 WHEN er.target_type = 'product' THEN (
                   SELECT i.id FROM products p 
                   LEFT JOIN inquiries i ON p.inquiry_code = i.inquiry_code 
                   WHERE p.id = er.target_id
                 )
                 ELSE NULL
               END as inquiry_id
        FROM edit_requests er
        JOIN users u ON er.requested_by = u.id
        WHERE 1=1
      `;
      const queryParams = [];

      if (status) {
        query += ` AND er.status = ?`;
        queryParams.push(status);
      }
      
      if (targetId && targetType) {
        // Find the related ID to block both (e.g., if checking product, also check its inquiry)
        connection = await createConnection();
        if (targetType === 'product') {
          const [prod] = await connection.execute('SELECT inquiry_code FROM products WHERE id = ?', [targetId]);
          if (prod.length > 0 && prod[0].inquiry_code) {
            const [inq] = await connection.execute('SELECT id FROM inquiries WHERE inquiry_code = ?', [prod[0].inquiry_code]);
            if (inq.length > 0) {
              query += ` AND ((er.target_type = 'product' AND er.target_id = ?) OR (er.target_type = 'inquiry' AND er.target_id = ?))`;
              queryParams.push(targetId, inq[0].id);
            } else {
              query += ` AND er.target_type = ? AND er.target_id = ?`;
              queryParams.push(targetType, targetId);
            }
          } else {
            query += ` AND er.target_type = ? AND er.target_id = ?`;
            queryParams.push(targetType, targetId);
          }
        } else if (targetType === 'inquiry') {
          const [inq] = await connection.execute('SELECT inquiry_code FROM inquiries WHERE id = ?', [targetId]);
          if (inq.length > 0 && inq[0].inquiry_code) {
            const [prod] = await connection.execute('SELECT id FROM products WHERE inquiry_code = ?', [inq[0].inquiry_code]);
            if (prod.length > 0) {
              query += ` AND ((er.target_type = 'inquiry' AND er.target_id = ?) OR (er.target_type = 'product' AND er.target_id = ?))`;
              queryParams.push(targetId, prod[0].id);
            } else {
              query += ` AND er.target_type = ? AND er.target_id = ?`;
              queryParams.push(targetType, targetId);
            }
          } else {
            query += ` AND er.target_type = ? AND er.target_id = ?`;
            queryParams.push(targetType, targetId);
          }
        }
      } else {
        if (targetId) {
          query += ` AND er.target_id = ?`;
          queryParams.push(targetId);
        }
        if (targetType) {
          query += ` AND er.target_type = ?`;
          queryParams.push(targetType);
        }
      }

      query += ` ORDER BY er.created_at DESC`;
      
      if (!connection) connection = await createConnection();
      const [requests] = await connection.execute(query, queryParams);
  
      return Response.json(requests);
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function PUT(req) {
    let connection;
    try {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role?.toLowerCase() !== 'direktur') {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const { id, status, validation_notes } = await req.json();
      connection = await createConnection();
  
      // 1. Fetch the request details
      const [requests] = await connection.execute("SELECT * FROM edit_requests WHERE id = ?", [id]);
      if (requests.length === 0) return Response.json({ error: "Request not found" }, { status: 404 });
      const request = requests[0];
  
      if (status === 'approved') {
        const newData = JSON.parse(request.new_data);
        const targetId = request.target_id;
        const targetType = request.target_type;
  
        if (targetType === 'product') {
          // Update product table with approved data
          const fieldsToUpdate = [
            'name = ?', 
            'inquiry_code = ?', 
            'category = ?', 
            'description = ?', 
            'start_date = ?', 
            'deadline = ?', 
            'type = ?', 
            'order_quantity = ?',
            'custom_attributes = ?',
            'validation_notes = ?'
          ];
          const queryValues = [
            newData.name || '', 
            newData.inquiry_code || '', 
            newData.category || '', 
            newData.description || '', 
            newData.startDate ? newData.startDate.split('T')[0] : (newData.start_date ? newData.start_date.split('T')[0] : null), 
            newData.deadline ? newData.deadline.split('T')[0] : null, 
            newData.type || 'New Product', 
            parseInt(newData.order_quantity) || 0,
            JSON.stringify(newData.custom_attributes || []),
            validation_notes || '', 
          ];

          // NEW: Handle status and completed_at
          if (newData.status) {
            fieldsToUpdate.push('status = ?');
            queryValues.push(newData.status);
            if (newData.status === 'completed') {
              fieldsToUpdate.push('completed_at = CURRENT_TIMESTAMP');
            } else {
              fieldsToUpdate.push('completed_at = NULL');
            }
          }

          const updateQuery = `UPDATE products SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
          await connection.execute(updateQuery, [...queryValues, targetId]);

          // Handle images for product
          if (newData.images && Array.isArray(newData.images)) {
            await connection.execute('DELETE FROM product_images WHERE product_id = ?', [targetId]);
            for (const url of newData.images) {
              await connection.execute('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [targetId, url]);
            }
          }

          // Handle assignees if provided
          if (newData.assignee_ids && Array.isArray(newData.assignee_ids)) {
            // Update product assignees
            await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [targetId]);
            if (newData.assignee_ids.length > 0) {
              const assigneeValues = newData.assignee_ids.map(userId => [targetId, userId]);
              await connection.query('INSERT INTO product_assignees (product_id, user_id) VALUES ?', [assigneeValues]);
            }

            // SYNC TO INQUIRY: Update inquiry assignees if it exists
            if (newData.inquiry_code) {
              const [inqRows] = await connection.execute('SELECT id FROM inquiries WHERE inquiry_code = ?', [newData.inquiry_code]);
              if (inqRows.length > 0) {
                const inqId = inqRows[0].id;
                await connection.execute('DELETE FROM inquiry_assignees WHERE inquiry_id = ?', [inqId]);
                if (newData.assignee_ids.length > 0) {
                  const inqAssigneeValues = newData.assignee_ids.map(userId => [inqId, userId]);
                  await connection.query('INSERT INTO inquiry_assignees (inquiry_id, user_id) VALUES ?', [inqAssigneeValues]);
                }
              }
            }
          }

            // Handle required materials if provided
            if (newData.requiredMaterials && Array.isArray(newData.requiredMaterials)) {
              await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [targetId]);
              for (const supplier of newData.requiredMaterials) {
                const materialId = supplier.supplier_id || supplier.material_id;
                if (materialId) {
                  await connection.execute(
                    'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
                    [targetId, materialId, supplier.quantity_needed || 1]
                  );
                }
              }
            }

            // Handle checklist if provided
          if (newData.checklist && Array.isArray(newData.checklist)) {
             // Basic sync: delete and re-insert for simplicity in validation approval
             await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [targetId]);
             for (const item of newData.checklist) {
               await connection.execute(
                 'INSERT INTO product_checklists (product_id, task, percentage) VALUES (?, ?, ?)',
                 [targetId, item.task || item.task_name, item.percentage || 0]
               );
             }
          }

          // SYNC TO INQUIRY: Also update the source inquiry dates to sync with the calendar
          if (newData.inquiry_code) {
            await connection.execute(
              `UPDATE inquiries SET 
                product_name = ?,
                request_date = ?, 
                image_deadline = ?,
                order_quantity = ?
               WHERE inquiry_code = ?`,
              [
                newData.name || '',
                newData.startDate ? newData.startDate.split('T')[0] : null, 
                newData.deadline ? newData.deadline.split('T')[0] : null, 
                parseInt(newData.order_quantity) || 0,
                newData.inquiry_code
              ]
            );

            // SYNC TO INQUIRY: Sync images to inquiry_images table
            if (newData.images && Array.isArray(newData.images)) {
              const [inqRows] = await connection.execute('SELECT id FROM inquiries WHERE inquiry_code = ?', [newData.inquiry_code]);
              if (inqRows.length > 0) {
                const inqId = inqRows[0].id;
                await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [inqId]);
                for (const url of newData.images) {
                  await connection.execute('INSERT INTO inquiry_images (inquiry_id, image_url) VALUES (?, ?)', [inqId, url]);
                }
              }
            }
            console.log(`Synced dates and images to Inquiry: ${newData.inquiry_code}`);
          }
        } else if (targetType === 'inquiry') {
          // Update inquiries table with approved data
          await connection.execute(
            `UPDATE inquiries SET 
              customer_name = ?, 
              customer_email = ?, 
              customer_phone = ?, 
              customer_address = ?, 
              product_name = ?, 
              product_description = ?, 
              customer_request = ?, 
              request_date = ?, 
              image_deadline = ?, 
              order_quantity = ?,
              validation_notes = ? 
             WHERE id = ?`,
            [
              newData.customer_name || '', 
              newData.customer_email || '', 
              newData.customer_phone || '', 
              newData.customer_address || '', 
              newData.product_name || '', 
              newData.product_description || '', 
              newData.customer_request || '', 
              newData.request_date ? newData.request_date.split('T')[0] : null, 
              newData.image_deadline ? newData.image_deadline.split('T')[0] : null, 
              newData.order_quantity || 0,
              validation_notes || '', 
              targetId
            ]
          );

          // Handle images for inquiry
          if (newData.images && Array.isArray(newData.images)) {
            await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [targetId]);
            for (const url of newData.images) {
              await connection.execute('INSERT INTO inquiry_images (inquiry_id, image_url) VALUES (?, ?)', [targetId, url]);
            }
          }

          // Handle assignees if provided
          if (newData.assignee_ids && Array.isArray(newData.assignee_ids)) {
            // Update inquiry assignees
            await connection.execute('DELETE FROM inquiry_assignees WHERE inquiry_id = ?', [targetId]);
            if (newData.assignee_ids.length > 0) {
              const assigneeValues = newData.assignee_ids.map(userId => [targetId, userId]);
              await connection.query('INSERT INTO inquiry_assignees (inquiry_id, user_id) VALUES ?', [assigneeValues]);
            }

            // SYNC TO PRODUCT: Update associated product assignees if it exists
            if (newData.inquiry_code) {
              const [prodRows] = await connection.execute('SELECT id FROM products WHERE inquiry_code = ?', [newData.inquiry_code]);
              if (prodRows.length > 0) {
                const prodId = prodRows[0].id;
                await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [prodId]);
                if (newData.assignee_ids.length > 0) {
                  const prodAssigneeValues = newData.assignee_ids.map(userId => [prodId, userId]);
                  await connection.query('INSERT INTO product_assignees (product_id, user_id) VALUES ?', [prodAssigneeValues]);
                }
              }
            }
          }

          // SYNC TO PRODUCT: Also update the associated product dates and images if it exists
          if (newData.inquiry_code) {
            const [prodRows] = await connection.execute('SELECT id FROM products WHERE inquiry_code = ?', [newData.inquiry_code]);
            if (prodRows.length > 0) {
              const prodId = prodRows[0].id;
              
              // Update product dates
              await connection.execute(
                `UPDATE products SET 
                  name = ?, 
                  start_date = ?, 
                  deadline = ?,
                  order_quantity = ?
                 WHERE id = ?`,
                [
                  newData.product_name || '',
                  newData.request_date ? newData.request_date.split('T')[0] : null,
                  newData.image_deadline ? newData.image_deadline.split('T')[0] : null,
                  newData.order_quantity || 0,
                  prodId
                ]
              );

              // Sync images to product_images
              if (newData.images && Array.isArray(newData.images)) {
                await connection.execute('DELETE FROM product_images WHERE product_id = ?', [prodId]);
                for (const url of newData.images) {
                  await connection.execute('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [prodId, url]);
                }
              }
              console.log(`Synced dates and images from Inquiry to Product: ${newData.inquiry_code}`);
            }
          }
        }
      }
  
      // 2. Update the request status
      await connection.execute(
        `UPDATE edit_requests SET status = ?, validated_by = ?, validation_notes = ? WHERE id = ?`,
        [status, session.user.id, validation_notes, id]
      );

      // 3. Notify the requester (Admin)
      const message = status === 'approved' 
        ? `Permintaan edit Anda untuk ${request.target_type} #${request.target_id} telah DISETUJUI.` 
        : `Permintaan edit Anda untuk ${request.target_type} #${request.target_id} telah DITOLAK: ${validation_notes || 'Tidak ada alasan spesifik'}`;
      
      const link = request.target_type === 'product' ? `/product/${request.target_id}` : `/inquiries`;
      
      await connection.execute(
        "INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)",
        [request.requested_by, message, link]
      );
  
      return Response.json({ message: `Edit request ${status} successfully.` });
    } catch (error) {
      console.error("Edit Request PUT Error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
