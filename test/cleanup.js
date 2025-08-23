const fs = require('fs');
const path = require('path');

function cleanup() {
    console.log('🧹 Cleaning up test files...');
    
    const filesToClean = [
        'generated-proposal.txt',
        'test-output.txt'
    ];
    
    let cleaned = 0;
    
    filesToClean.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted: ${file}`);
            cleaned++;
        }
    });
    
    if (cleaned === 0) {
        console.log('✨ No files to clean');
    } else {
        console.log(`✨ Cleaned ${cleaned} file(s)`);
    }
}

if (require.main === module) {
    cleanup();
}

module.exports = { cleanup };
