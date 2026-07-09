const fs = require('fs');
const path = require('path');
const https = require('https');

const assetsDir = path.join(__dirname, '..', 'assets');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded to ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  try {
    // 1. Download Avatar from DiceBear API
    console.log('Downloading robot avatar...');
    const avatarUrl = 'https://api.dicebear.com/7.x/bottts/png?seed=TeachPlayerCompanion&backgroundType=solid&backgroundColor=0a1a00';
    await download(avatarUrl, path.join(assetsDir, 'user-default-avatar.png'));

    // 2. Download App Icon from FluentUI Emoji
    console.log('Downloading 3D play button icon...');
    const playButtonUrl = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Play%20button/3D/play_button_3d.png';
    await download(playButtonUrl, path.join(assetsDir, 'icon.png'));
    await download(playButtonUrl, path.join(assetsDir, 'adaptive-icon.png'));
    await download(playButtonUrl, path.join(assetsDir, 'splash-icon.png'));
    await download(playButtonUrl, path.join(assetsDir, 'favicon.png'));

    console.log('All downloads completed successfully!');
  } catch (error) {
    console.error('Error downloading assets:', error);
    process.exit(1);
  }
}

main();
