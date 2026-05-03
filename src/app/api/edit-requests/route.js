import createConnection from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    // 1. Insert into edit_requests table
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
      if (!session || (userRole !== 'direktur' && userRole !== 'admin')) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      connection = await createConnection();
      // Fetch pending edit requests with requester name
      const [requests] = await connection.execute(`
        SELECT er.*, u.name as requester_name 
        FROM edit_requests er
        JOIN users u ON er.requested_by = u.id
        WHERE er.status = 'pending'
        ORDER BY er.created_at DESC
      `);
  
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

          // Handle assignees if provided
          if (newData.assignee_ids && Array.isArray(newData.assignee_ids)) {
            await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [targetId]);
            if (newData.assignee_ids.length > 0) {
              const assigneeValues = newData.assignee_ids.map(userId => [targetId, userId]);
              await connection.query('INSERT INTO product_assignees (product_id, user_id) VALUES ?', [assigneeValues]);
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
                request_date = ?, 
                image_deadline = ?,
                order_quantity = ?
               WHERE inquiry_code = ?`,
              [
                newData.startDate ? newData.startDate.split('T')[0] : null, 
                newData.deadline ? newData.deadline.split('T')[0] : null, 
                parseInt(newData.order_quantity) || 0,
                newData.inquiry_code
              ]
            );
            console.log(`Synced dates to Inquiry: ${newData.inquiry_code}`);
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

          // SYNC TO PRODUCT: Also update the associated product dates if it exists
          if (newData.inquiry_code) {
            await connection.execute(
              `UPDATE products SET 
                start_date = ?, 
                deadline = ? 
               WHERE inquiry_code = ?`,
              [
                newData.request_date ? newData.request_date.split('T')[0] : null, 
                newData.image_deadline ? newData.image_deadline.split('T')[0] : null, 
                newData.inquiry_code
              ]
            );
            console.log(`Synced dates from Inquiry to Product: ${newData.inquiry_code}`);
          }
        }
      }
  
      // 2. Update the request status
      await connection.execute(
        `UPDATE edit_requests SET status = ?, validated_by = ?, validation_notes = ? WHERE id = ?`,
        [status, session.user.id, validation_notes, id]
      );
  
      return Response.json({ message: `Edit request ${status} successfully.` });
    } catch (error) {
      console.error("Edit Request PUT Error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
