import { query } from "./src/app/lib/db.js";

async function checkEdits() {
    try {
        const results = await query("SELECT * FROM edit_requests");
        console.log("Edit Requests Count:", results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error("Error checking edits:", e.message);
    }
    process.exit();
}

checkEdits();
