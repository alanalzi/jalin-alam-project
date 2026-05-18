// src/app/lib/dateUtils.js

/**
 * Calculates the number of working days between two dates, 
 * excluding weekends (Saturday, Sunday) and a list of holiday dates.
 * 
 * @param {string|Date} startDate 
 * @param {string|Date} endDate 
 * @param {Array<string>} holidayDates - Array of 'YYYY-MM-DD' strings
 * @returns {number} Number of working days
 */
export function calculateWorkingDays(startDate, endDate, holidayDates = []) {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    if (end < start) return 0;

    let count = 0;
    let current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateString = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
        
        // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = Array.isArray(holidayDates) && holidayDates.includes(dateString);

        if (!isWeekend && !isHoliday) {
            count++;
        }

        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Browser-only helper to fetch holidays from the API
 */
export async function fetchHolidaysFromAPI() {
    if (typeof window === 'undefined') return []; // Prevent execution on server
    try {
        const res = await fetch('/api/holidays');
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(h => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        });
    } catch (error) {
        console.error("Error fetching holidays:", error);
        return [];
    }
}
