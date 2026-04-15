const messageBuffer = new Map(); // channelId -> array of messages

module.exports = {
    addMessage: (message) => {
        if (!message || message.author.bot) return;

        const channelId = message.channelId;
        if (!messageBuffer.has(channelId)) {
            messageBuffer.set(channelId, []);
        }

        const buffer = messageBuffer.get(channelId);
        
        // Push message data
        buffer.push({
            content: message.content,
            author: {
                username: message.author.username,
                avatarURL: message.author.displayAvatarURL(),
            },
            embeds: message.embeds,
            attachments: Array.from(message.attachments.values()),
            createdTimestamp: message.createdTimestamp,
        });

        // Keep last 100
        if (buffer.length > 100) {
            buffer.shift();
        }
    },

    getMessages: (channelId) => {
        return messageBuffer.get(channelId) || [];
    },

    clearBuffer: (channelId) => {
        messageBuffer.delete(channelId);
    }
};
