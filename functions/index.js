const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.onAchievementDelete = functions.firestore
  .document("achievements/{achId}")
  .onDelete(async (snap, context) => {
    const achId = context.params.achId;
    const bucket = admin.storage().bucket();
    
    // Удаляем папку achievementId
    // В Google Cloud Storage нет понятия папок, удаляем по префиксу
    const [files] = await bucket.getFiles({ prefix: `achievements/${achId}/` });
    
    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);
    
    console.log(`Files for achievement ${achId} deleted.`);
  });
