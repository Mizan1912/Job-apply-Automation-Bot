/**
 * Helper to parse experience string (e.g., '0 - 1 Yrs', 'Fresher', '5 Yrs', 'Not disclosed')
 * into min and max experience integers.
 * @param {string} expStr 
 * @returns {{min: number, max: number}}
 */
export function parseExperience(expStr) {
  if (!expStr) return { min: 0, max: 0 };
  const cleanExp = expStr.toLowerCase().trim();
  
  if (cleanExp.includes('fresher')) {
    return { min: 0, max: 0 };
  }

  const rangeMatch = cleanExp.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  const singleMatch = cleanExp.match(/(\d+)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { min: val, max: val };
  }

  return { min: 0, max: 0 };
}

/**
 * Filter jobs based on locational keyword tags and required experience thresholds.
 * @param {object} job 
 * @param {object} config 
 * @returns {{eligible: boolean, reason?: string}}
 */
export function filterJob(job, config) {
  const { keywords, locations, maxExperience } = config;

  // 1. Title/Keyword Check (Secondary check, primary is url construction)
  const jobTitleLower = job.title.toLowerCase();
  const matchesKeyword = keywords.some(keyword => {
    const cleanKw = keyword.toLowerCase().trim();
    // Simple matching (regex or contains)
    return jobTitleLower.includes(cleanKw);
  });

  if (!matchesKeyword) {
    return { eligible: false, reason: `Job title "${job.title}" doesn't match configured keywords` };
  }

  // 2. Experience Filter
  // Accept job if its minimum required experience is less than or equal to user's configured maximum experience.
  const jobExp = parseExperience(job.experience);
  if (jobExp.min > maxExperience) {
    return { eligible: false, reason: `Requires ${job.experience} which exceeds max filtered experience (${maxExperience} years)` };
  }

  // 3. Location Filter
  // Accept if job location contains any of the configured filter locations
  const jobLocLower = (job.location || '').toLowerCase();
  const matchesLocation = locations.some(loc => {
    const cleanLoc = loc.toLowerCase().trim();
    // Handle 'bengaluru' and 'bangalore' equivalence
    if (cleanLoc === 'bangalore' || cleanLoc === 'bengaluru') {
      return jobLocLower.includes('bangalore') || jobLocLower.includes('bengaluru');
    }
    return jobLocLower.includes(cleanLoc);
  });

  if (!matchesLocation) {
    return { eligible: false, reason: `Location "${job.location}" doesn't match target locations: ${locations.join(', ')}` };
  }

  // 4. Stale listings safety filter (skip jobs older than 30 days)
  const postedLower = (job.posted_date || '').toLowerCase();
  if (postedLower.includes('30+') || postedLower.includes('30+ days')) {
    return { eligible: false, reason: `Job is too old (${job.posted_date})` };
  }

  return { eligible: true };
}
