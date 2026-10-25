const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/expo-notifications/build/TopicSubscriptionModule.android.js');

if (fs.existsSync(targetFile)) {
  const content = fs.readFileSync(targetFile, 'utf8');
  if (!content.includes('requireOptionalNativeModule')) {
    const patchedContent = `import { requireOptionalNativeModule } from 'expo';
const fallback = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') ?? fallback;
`;
    fs.writeFileSync(targetFile, patchedContent, 'utf8');
    console.log('Successfully patched expo-notifications TopicSubscriptionModule.android.js for Expo Go.');
  } else {
    console.log('expo-notifications TopicSubscriptionModule.android.js is already patched.');
  }
} else {
  console.log('expo-notifications TopicSubscriptionModule.android.js not found (skip).');
}
