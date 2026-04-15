const actions = new Map();

module.exports = {
    /**
     * Increment and check if mass action threshold is exceeded.
     * @param {string} userId The ID of the executor.
     * @param {string} type 'kick' or 'ban'
     * @param {number} limit Max allowed in time window.
     * @param {number} windowMs Time window in milliseconds.
     * @returns {boolean} True if exceeded, false otherwise.
     */
    checkMassAction: (userId, type, limit = 3, windowMs = 10000) => {
        const key = `${userId}_${type}`;
        const now = Date.now();
        
        if (!actions.has(key)) {
            actions.set(key, []);
        }
        
        const userActions = actions.get(key);
        // Remove expired actions
        const currentActions = userActions.filter(timestamp => now - timestamp < windowMs);
        currentActions.push(now);
        actions.set(key, currentActions);
        
        return currentActions.length > limit;
    }
};
