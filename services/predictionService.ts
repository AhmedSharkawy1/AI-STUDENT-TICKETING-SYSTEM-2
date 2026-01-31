
import { DEPARTMENTS } from "../constants";

export const predictDepartment = (complaintText: string): string => {
    const text = complaintText.toLowerCase();

    if (text.includes('laptop') || text.includes('password') || text.includes('portal') || text.includes('wifi') || text.includes('crashing') || text.includes('sign in')) {
        return DEPARTMENTS[2]; // IT
    }
    if (text.includes('fee') || text.includes('scholarship') || text.includes('payment') || text.includes('financial')) {
        return DEPARTMENTS[1]; // Financial Support
    }
    if (text.includes('course') || text.includes('grades') || text.includes('professor') || text.includes('exam') || text.includes('major') || text.includes('academic')) {
        return DEPARTMENTS[0]; // Academic Support and Resources
    }
    
    return DEPARTMENTS[3]; // Student Affairs (Default)
};
