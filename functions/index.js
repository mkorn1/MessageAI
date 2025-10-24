/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Cloud Function to send push notifications when a new message is created
exports.sendMessageNotification = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const messageData = event.data.data();
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;
    
    logger.info(`New message created in chat ${chatId}:`, {
      messageId,
      senderId: messageData.senderId,
      text: messageData.text?.substring(0, 50) + "..."
    });

    try {
      // Get chat document to find participants
      const chatDoc = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .get();
      
      if (!chatDoc.exists) {
        logger.error(`Chat ${chatId} not found`);
        return;
      }

      const chatData = chatDoc.data();
      const participants = chatData.participants || [];
      const senderId = messageData.senderId;

      // Get sender information
      const senderDoc = await admin.firestore()
        .collection("users")
        .doc(senderId)
        .get();
      
      if (!senderDoc.exists) {
        logger.error(`Sender ${senderId} not found`);
        return;
      }

      const senderData = senderDoc.data();
      const senderName = senderData.displayName || senderData.email || "Unknown User";

      // Get recipients (all participants except sender)
      const recipients = participants.filter(id => id !== senderId);
      
      if (recipients.length === 0) {
        logger.info(`No recipients for message in chat ${chatId}`);
        return;
      }

      logger.info(`Sending notifications to ${recipients.length} recipients`);

      // Send notifications to each recipient
      const notificationPromises = recipients.map(async (recipientId) => {
        try {
          // Get recipient's user document
          const recipientDoc = await admin.firestore()
            .collection("users")
            .doc(recipientId)
            .get();
          
          if (!recipientDoc.exists) {
            logger.warn(`Recipient ${recipientId} not found`);
            return;
          }

          const recipientData = recipientDoc.data();
          const fcmToken = recipientData.fcmToken;

          if (!fcmToken) {
            logger.warn(`No FCM token for recipient ${recipientId}`);
            return;
          }

          // Check if recipient is online (using presence system)
          const presenceDoc = await admin.firestore()
            .collection("presence")
            .doc(recipientId)
            .get();
          
          const isOnline = presenceDoc.exists && presenceDoc.data().status === "online";
          
          // For MVP: Only send notifications if user is online (foreground notifications)
          if (!isOnline) {
            logger.info(`Recipient ${recipientId} is offline, skipping notification`);
            return;
          }

          // Build notification payload with enhanced group chat support
          const chatType = chatData.type || "direct";
          const chatName = chatData.name || (chatType === "group" ? "Group Chat" : "Direct Message");
          
          // Format title based on chat type
          let title;
          if (chatType === "group") {
            title = `${senderName} in ${chatName}`;
          } else {
            title = senderName;
          }
          
          // Format body with message preview
          const messageText = messageData.text || "New message";
          const body = messageText.length > 50 
            ? messageText.substring(0, 50) + "..."
            : messageText;

          const notification = {
            title: title,
            body: body,
            data: {
              chatId: chatId,
              messageId: messageId,
              senderId: senderId,
              senderName: senderName,
              chatName: chatName,
              chatType: chatType,
              messageText: messageText
            }
          };

          // Send FCM notification
          await admin.messaging().send({
            token: fcmToken,
            notification: notification,
            android: {
              priority: "high",
              notification: {
                sound: "default"
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1
                }
              }
            }
          });

          logger.info(`Notification sent to ${recipientId}`);
        } catch (error) {
          logger.error(`Failed to send notification to ${recipientId}:`, error);
        }
      });

      await Promise.all(notificationPromises);
      logger.info(`Message notification process completed for chat ${chatId}`);
      
    } catch (error) {
      logger.error(`Error processing message notification:`, error);
    }
  }
);
